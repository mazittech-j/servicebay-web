const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const encoder=new TextEncoder();

export function base32Encode(bytes){
  let bits=0,value=0,out='';
  for(const b of bytes){
    value=(value<<8)|b;bits+=8;
    while(bits>=5){out+=ALPHABET[(value>>>(bits-5))&31];bits-=5}
  }
  if(bits>0)out+=ALPHABET[(value<<(5-bits))&31];
  return out;
}

export function base32Decode(str){
  const clean=String(str||'').toUpperCase().replace(/[^A-Z2-7]/g,'');
  let bits=0,value=0;const out=[];
  for(const ch of clean){
    const idx=ALPHABET.indexOf(ch);if(idx<0)continue;
    value=(value<<5)|idx;bits+=5;
    if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8}
  }
  return new Uint8Array(out);
}

export function generateSecret(){
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

export async function totpCode(secret,step=Math.floor(Date.now()/30000)){
  const keyBytes=base32Decode(secret);
  const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const buf=new ArrayBuffer(8),view=new DataView(buf);
  view.setUint32(0,Math.floor(step/0x100000000),false);
  view.setUint32(4,step>>>0,false);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,buf));
  const offset=sig[sig.length-1]&0x0f;
  const bin=((sig[offset]&0x7f)<<24)|((sig[offset+1]&0xff)<<16)|((sig[offset+2]&0xff)<<8)|(sig[offset+3]&0xff);
  return String(bin%1000000).padStart(6,'0');
}

function sameCode(a,b){
  if(!a||!b||a.length!==b.length)return false;
  let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);
  return d===0;
}

export async function verifyTotp(secret,code,window=1,lastStep=0){
  const clean=String(code||'').replace(/\s+/g,'');
  if(!/^\d{6}$/.test(clean))return null;
  const nowStep=Math.floor(Date.now()/30000);
  for(let delta=-window;delta<=window;delta++){
    const step=nowStep+delta;
    if(step<=0||step<=lastStep)continue;
    const expected=await totpCode(secret,step);
    if(sameCode(clean,expected))return step;
  }
  return null;
}

export function totpUri({secret,label,issuer='ServiceBay Studio'}){
  const iss=encodeURIComponent(issuer);
  const lbl=encodeURIComponent(label||'owner');
  return `otpauth://totp/${iss}:${lbl}?secret=${encodeURIComponent(secret)}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}

export function generateBackupCodes(count=8){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes=[];
  for(let i=0;i<count;i++){
    const bytes=crypto.getRandomValues(new Uint8Array(8));
    let s='';for(let j=0;j<8;j++){if(j===4)s+='-';s+=chars[bytes[j]%chars.length]}
    codes.push(s);
  }
  return codes;
}

// Minimal QR Code Generator (Byte mode, ECC Level L, Versions 1-8)
const GF_EXP=new Uint8Array(512),GF_LOG=new Uint8Array(256);
{let x=1;for(let i=0;i<255;i++){GF_EXP[i]=x;GF_LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(let i=255;i<512;i++)GF_EXP[i]=GF_EXP[i-255]}
const gfMul=(a,b)=>a&&b?GF_EXP[GF_LOG[a]+GF_LOG[b]]:0;
function rsGen(deg){
  let g=[1];
  for(let i=0;i<deg;i++){
    const next=new Array(g.length+1).fill(0),f=GF_EXP[i];
    for(let j=0;j<g.length;j++){next[j]^=g[j];next[j+1]^=gfMul(g[j],f)}
    g=next;
  }
  return g;
}
function rsEncode(data,ecLen){
  const gen=rsGen(ecLen),res=new Uint8Array(data.length+ecLen);
  res.set(data);
  for(let i=0;i<data.length;i++){
    const c=res[i];if(!c)continue;
    for(let j=0;j<gen.length;j++)res[i+j]^=gfMul(gen[j],c);
  }
  return res.slice(data.length);
}

// Version specs for ECC-L: [totalDataBytes, ecPerBlock, numBlocks, alignPositions]
const SPECS=[
  null,
  [19,7,1,[]],
  [34,10,1,[6,18]],
  [55,15,1,[6,22]],
  [80,20,1,[6,26]],
  [108,26,1,[6,30]],
  [136,18,2,[6,34]],
  [156,20,2,[6,22,38]],
  [194,24,2,[6,24,42]],
  [232,30,2,[6,26,46]],
  [274,18,4,[6,28,50]]
];

export function qrSvg(text){
  const bytes=encoder.encode(text);
  let ver=1;
  while(ver<SPECS.length&&bytes.length+2>(ver>=10?SPECS[ver][0]-1:SPECS[ver][0]))ver++;
  if(ver>=SPECS.length)return '';
  const [dataCap,ecLen,blocks,aligns]=SPECS[ver];
  const size=ver*4+17;
  const bits=[];
  const pushBits=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1)};
  pushBits(0b0100,4);
  pushBits(bytes.length,ver>=10?16:8);
  for(const b of bytes)pushBits(b,8);
  const maxBits=dataCap*8;
  for(let i=0;i<4&&bits.length<maxBits;i++)bits.push(0);
  while(bits.length%8)bits.push(0);
  const dataBytes=new Uint8Array(dataCap);
  for(let i=0;i<bits.length/8;i++){let v=0;for(let j=0;j<8;j++)v=(v<<1)|bits[i*8+j];dataBytes[i]=v}
  for(let i=bits.length/8,p=0;i<dataCap;i++,p++)dataBytes[i]=p%2===0?0xec:0x11;

  // Split into blocks & interleave
  const shortLen=Math.floor(dataCap/blocks),longBlocks=dataCap%blocks,firstLong=blocks-longBlocks;
  const dBlocks=[],eBlocks=[];let off=0;
  for(let b=0;b<blocks;b++){
    const len=shortLen+(b>=firstLong?1:0);
    const slice=dataBytes.slice(off,off+len);off+=len;
    dBlocks.push(slice);eBlocks.push(rsEncode(slice,ecLen));
  }
  const codewords=[];
  const maxD=shortLen+(longBlocks?1:0);
  for(let i=0;i<maxD;i++)for(let b=0;b<blocks;b++)if(i<dBlocks[b].length)codewords.push(dBlocks[b][i]);
  for(let i=0;i<ecLen;i++)for(let b=0;b<blocks;b++)codewords.push(eBlocks[b][i]);

  const grid=Array.from({length:size},()=>new Int8Array(size).fill(-1));
  const reserved=Array.from({length:size},()=>new Uint8Array(size));
  const set=(r,c,v,res=true)=>{if(r>=0&&r<size&&c>=0&&c<size){grid[r][c]=v?1:0;if(res)reserved[r][c]=1}};
  const finder=(r0,c0)=>{
    for(let dr=-1;dr<=7;dr++)for(let dc=-1;dc<=7;dc++){
      const r=r0+dr,c=c0+dc;
      if(r<0||r>=size||c<0||c>=size)continue;
      const inB=dr>=0&&dr<=6&&dc>=0&&dc<=6;
      const v=inB&&(dr===0||dr===6||dc===0||dc===6||(dr>=2&&dr<=4&&dc>=2&&dc<=4));
      set(r,c,v);
    }
  };
  finder(0,0);finder(0,size-7);finder(size-7,0);
  for(const r of aligns)for(const c of aligns){
    if(reserved[r][c])continue;
    for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)set(r+dr,c+dc,Math.abs(dr)===2||Math.abs(dc)===2||(dr===0&&dc===0));
  }
  for(let i=8;i<size-8;i++){if(!reserved[6][i])set(6,i,i%2===0);if(!reserved[i][6])set(i,6,i%2===0)}
  set(size-8,8,1);
  for(let i=0;i<9;i++){if(i!==6){reserved[8][i]=1;reserved[i][8]=1}}
  for(let i=0;i<8;i++){reserved[8][size-1-i]=1;reserved[size-1-i][8]=1}

  // Place data bits
  const allBits=[];
  for(const cw of codewords)for(let i=7;i>=0;i--)allBits.push((cw>>>i)&1);
  let bitIdx=0,up=true;
  for(let col=size-1;col>=0;col-=2){
    if(col===6)col--;
    for(let i=0;i<size;i++){
      const r=up?size-1-i:i;
      for(let dc=0;dc<2;dc++){
        const c=col-dc;
        if(!reserved[r][c]){
          const b=bitIdx<allBits.length?allBits[bitIdx++]:0;
          // Mask 0: (r + c) % 2 === 0
          grid[r][c]=b^((r+c)%2===0?1:0);
        }
      }
    }
    up=!up;
  }

  // Format info for ECC-L (01) + Mask 0 (000) -> 01000, BCH(15,5) -> 0x77c4 ^ 0x5412 = 0x23d6? Let's compute BCH directly!
  let fmt=0b01000<<10;
  let rem=fmt;
  const poly=0b10100110111;
  for(let i=14;i>=10;i--)if((rem>>>i)&1)rem^=poly<<(i-10);
  fmt=(fmt|rem)^0b101010000010010;
  for(let i=0;i<15;i++){
    const v=(fmt>>>i)&1;
    if(i<6)grid[8][i]=v;else if(i<8)grid[8][i+1]=v;else grid[size-15+i][8]=v;
    if(i<8)grid[size-1-i][8]=v;else if(i<9)grid[8][15-i]=v;else grid[8][15-i-1]=v;
  }

  const rects=[];
  for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(grid[r][c]===1)rects.push(`<rect x="${c+2}" y="${r+2}" width="1" height="1"/>`);
  const vb=size+4;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="180" height="180" shape-rendering="crispEdges" role="img" aria-label="Google Authenticator QR code"><rect width="${vb}" height="${vb}" fill="#fff"/><g fill="#14283b">${rects.join('')}</g></svg>`;
}
