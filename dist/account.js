(() => {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.pw-toggle');
    if (!btn) return;
    const input = btn.parentElement?.querySelector('input');
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  const form = document.querySelector('#studio-auth');
  const forgotForm = document.querySelector('#forgot-form');
  const forgotToggle = document.querySelector('#forgot-toggle');
  const forgotCancel = document.querySelector('#forgot-cancel');
  const credSlot = document.querySelector('#cred-slot');
  const totpSlot = document.querySelector('#totp-slot');
  const confirmSlot = document.querySelector('#confirm-slot');
  const params = new URLSearchParams(location.hash.slice(1));
  const inviteToken = params.get('invite');
  const resetToken = params.get('reset');
  let challenge = '';

  const eyeBtn = '<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false">Show</button>';
  const confirmHtml = '<label>Confirm password<span class="pw-wrap"><input name="confirm" type="password" autocomplete="new-password" minlength="15" maxlength="128" required>' + eyeBtn + '</span></label>';

  if (inviteToken || resetToken) {
    history.replaceState(null, '', location.pathname);
    form.dataset.action = inviteToken ? 'activate' : 'reset';
    document.querySelector('#gate-title').textContent = inviteToken ? 'Activate your editor account' : 'Reset your studio password';
    document.querySelector('#gate-copy').textContent = 'Choose a studio password of at least 15 characters.';
    form.elements.email.value = params.get('email') || '';
    form.elements.email.readOnly = true;
    form.elements.password.autocomplete = 'new-password';
    form.elements.password.minLength = 15;
    if (confirmSlot && !confirmSlot.innerHTML) confirmSlot.innerHTML = confirmHtml;
    form.querySelector('button.primary').textContent = inviteToken ? 'Activate account' : 'Save new password';
    if (forgotToggle) forgotToggle.hidden = true;
  }

  if (forgotToggle && forgotForm) {
    forgotToggle.onclick = () => {
      form.hidden = true;
      forgotToggle.parentElement.hidden = true;
      forgotForm.hidden = false;
      document.querySelector('#gate-title').textContent = 'Request password reset';
      document.querySelector('#gate-copy').textContent = 'Enter your studio email or username. The website owner will be notified to send you a reset link.';
      forgotForm.querySelector('.result').textContent = '';
    };
    forgotCancel.onclick = () => {
      forgotForm.hidden = true;
      form.hidden = false;
      forgotToggle.parentElement.hidden = false;
      document.querySelector('#gate-title').textContent = 'Studio sign in';
      document.querySelector('#gate-copy').textContent = 'Enter your studio credentials to manage the website.';
    };
    forgotForm.onsubmit = async e => {
      e.preventDefault();
      const button = forgotForm.querySelector('button.primary');
      const status = forgotForm.querySelector('.result');
      const data = Object.fromEntries(new FormData(forgotForm));
      button.disabled = true;
      status.textContent = '';
      try {
        const res = await fetch('/api/studio-auth/forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        let result = {};
        try { result = await res.json(); } catch {}
        if (!res.ok) throw Error(result.error || 'Could not send reset request.');
        status.textContent = result.message || 'Reset request sent to the website owner.';
        forgotForm.reset();
      } catch (err) {
        status.textContent = err.message;
      } finally {
        button.disabled = false;
      }
    };
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const button = form.querySelector('button.primary');
    const status = form.querySelector('.result');
    const data = Object.fromEntries(new FormData(form));
    if (data.confirm !== undefined && data.confirm !== data.password) {
      status.textContent = 'The passwords do not match.';
      return;
    }
    button.disabled = true;
    status.textContent = '';
    try {
      const action = challenge ? 'verify-2fa' : form.dataset.action;
      const payload = challenge
        ? { challenge, code: data.code, website: data.website }
        : { ...data, invite: inviteToken, token: resetToken };
      const res = await fetch('/api/studio-auth/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let result = {};
      try { result = await res.json(); } catch {}
      if (!res.ok) throw Error(result.error || 'Incorrect email/username or password.');
      if (result.requires2fa) {
        challenge = result.challenge;
        if (credSlot) {
          credSlot.hidden = true;
          credSlot.querySelectorAll('input').forEach(i => { i.required = false; });
        }
        if (totpSlot) {
          totpSlot.hidden = false;
          const codeInput = totpSlot.querySelector('input');
          if (codeInput) { codeInput.required = true; codeInput.focus(); }
        }
        if (forgotToggle) forgotToggle.parentElement.hidden = true;
        document.querySelector('#gate-title').textContent = 'Two-factor verification';
        document.querySelector('#gate-copy').textContent = 'Enter the 6-digit code from Google Authenticator (or a backup code).';
        button.textContent = 'Verify & sign in';
        return;
      }
      location.replace('/admin/');
    } catch (err) {
      status.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  };
})();
