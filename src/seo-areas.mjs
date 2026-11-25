import { tradePath } from './primary-guides.mjs';
// Neighbourhood source notes accompany each entry. Visit instructions are practical
// suggestions for customers to confirm with their own building or community.
const residential = (label, trade) => ({ label, href: tradePath(trade,'residential') });
const commercial = (label, trade) => ({ label, href: tradePath(trade,'commercial') });

export const areas = [
  // https://www.visitdubai.com/explore-dubai/dubai-neighbourhoods/business-bay
  {
    name: 'Business Bay', slug: 'business-bay',
    intro: 'Business Bay has a mix of offices and homes in high-rise towers. Tell us which floor and suite needs attention, whether it is an office with a lighting fault or an apartment with weak cooling.',
    heading: 'Plan the visit around the tower',
    detail: 'For an office repair, list the rooms affected and when those rooms can be taken out of use. For cooling faults, tell us whether one room or the whole unit is affected and whether building management has already checked the common system.',
    access: 'Send the tower name, the service entrance and any visitor registration or loading instructions from reception.',
    services: [commercial('Office electrical repairs', 'electrical'), residential('Apartment AC servicing', 'hvac'), commercial('Office plumbing', 'plumbing')],
    question: 'Can I request a repair outside office hours?',
    answer: 'Yes. Include the working hours of the office and the time windows your building permits. The team can check both when arranging a visit.',
  },
  // https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/downtown-dubai
  {
    name: 'Downtown Dubai', slug: 'downtown-dubai',
    intro: 'A landmark such as Dubai Mall or Burj Khalifa helps identify the neighbourhood, but the building and entrance are what get a technician to the right apartment or shop.',
    heading: 'Prepare a handover list by room',
    detail: 'For an apartment handover, group paint marks, loose fittings and sticking doors by room. Photos of a whole wall and a close-up of the damage help distinguish a local touch-up from a full-wall repaint.',
    access: 'Give the tower or retail complex name, an on-site contact and any contractor access window. For bulky items, ask the building which lift can be used.',
    services: [residential('Handover painting', 'painting'), residential('Door and cabinet adjustments', 'carpentry'), commercial('Shop lighting repairs', 'electrical')],
    question: 'Can I send a snag list before I have the keys?',
    answer: 'You can send a list and any photos ahead of time. Share the key collection date and who will give access so a visit can be scheduled once the property is available.',
  },
  // https://www.visitdubai.com/explore-dubai/dubai-neighbourhoods/dubai-marina
  {
    name: 'Dubai Marina', slug: 'dubai-marina',
    intro: 'Along Dubai Marina, a waterfront entrance and a vehicle entrance can bring visitors to different sides of the same building. An entrance pin is particularly helpful for a first visit.',
    heading: 'Describe the leak before the visit',
    detail: 'For a bathroom or kitchen leak, tell us when the water appears and whether the wet patch is at a fitting, under a cabinet or on a ceiling. Note if the building team has already inspected the apartment above.',
    access: 'Share the tower name, unit and vehicle entrance. If reception holds a key, confirm who can authorise its release.',
    services: [residential('Apartment leak assessment', 'plumbing'), residential('Ceiling repairs', 'ceilings'), residential('AC fault checks', 'hvac')],
    question: 'Can a ceiling stain and a plumbing fault be assessed together?',
    answer: 'Mention both in one enquiry and include photos. The source of the moisture needs checking before anyone can quote reliably for repairing the finish.',
  },
  // https://jlt.ae/about and https://jlt.ae/hubfs/o2-Website%202023%20Assets/o2-Website%202023-PDF%20Updates%20%28Nov%2023%29/footer/JLT-MAP_update_aug_10.pdf
  {
    name: 'JLT', slug: 'jlt',
    intro: 'In Jumeirah Lakes Towers, the cluster letter and tower name help pinpoint the address. A cluster can contain several buildings, so include both when booking an apartment or office repair.',
    heading: 'Separate suite work from communal work',
    detail: 'For a lighting or cooling issue, describe whether it affects your suite, an adjacent suite or a shared corridor. This helps determine whether the building team needs to take part before work can be scoped.',
    access: 'Give the cluster letter, tower and suite number. If equipment must enter through a podium or basement, share reception’s directions.',
    services: [commercial('Office cooling checks', 'hvac'), commercial('Lighting and socket repairs', 'electrical'), residential('Apartment plumbing', 'plumbing')],
    question: 'What should I send for an office partition change?',
    answer: 'Send a sketch or marked-up floor plan, a photo of the ceiling and the intended position of the partition. Include any instructions already issued by the landlord or fit-out team.',
  },
  // https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/jumeirah
  {
    name: 'Jumeirah', slug: 'jumeirah',
    intro: 'Jumeirah’s coastal streets include homes as well as villas used for cafés and boutiques. Tell us how the property is used so the work can be scoped around residents, staff or customers.',
    heading: 'Identify the exact fitting and finish',
    detail: 'A sticking entrance door, a swollen cabinet panel and a loose internal hinge call for different materials. Share a photo of the whole opening and a close-up of the damaged part, especially if the existing finish needs matching.',
    access: 'Include the street, villa number and which entrance to use. If the property trades during the day, note which rooms must stay open.',
    services: [residential('Villa doors and joinery', 'carpentry'), residential('Interior repainting', 'painting'), commercial('Retail fixture repairs', 'handyman')],
    question: 'Can a villa used as a boutique request commercial maintenance?',
    answer: 'Yes. Describe the trading space, the fixtures that need attention and your opening hours. This helps us plan the work around customer access.',
  },
  // https://www.theviewpalm.ae/en/museum/the-island-takes-shape
  {
    name: 'Palm Jumeirah', slug: 'palm-jumeirah',
    intro: 'Palm Jumeirah includes apartments on the trunk and villas along the fronds. Identify which part of the island you are on so the team can prepare for either building access or a villa visit.',
    heading: 'Map the problem across a larger home',
    detail: 'For uneven water pressure or cooling, list the rooms affected and whether the issue occurs on one floor or several. A short description of where the plant or utility room sits is more useful than the villa size alone.',
    access: 'For a villa, include the frond and villa number. For an apartment, provide the residence, entrance and any service-lift booking details.',
    services: [residential('Plumbing and pump assessments', 'plumbing'), residential('Villa and apartment AC', 'hvac'), residential('Tile and grout repairs', 'flooring')],
    question: 'What if the equipment is outside my apartment?',
    answer: 'Tell us where it sits and who controls access. For equipment in a shared plant room, building management may need to arrange entry or confirm responsibility.',
  },
  // https://www.dubai.ae/web/dubai.ae/visit/staying-in-dubai/dubai-neighborhoods/
  {
    name: 'Al Barsha', slug: 'al-barsha',
    intro: 'Al Barsha has homes, shops and hospitality properties. Give the sub-area and property type when describing a repair, particularly if the nearest familiar landmark is Mall of the Emirates.',
    heading: 'Make a multi-room cooling check easier',
    detail: 'Tell us the number of AC units and which thermostats or rooms are affected. If a unit was recently serviced, share what was done and whether the symptom returned immediately or after several days.',
    access: 'Send the building or villa number, street pin and the location of any equipment that needs roof or utility-room access.',
    services: [residential('Residential AC checks', 'hvac'), commercial('Commercial AC servicing', 'hvac'), residential('Tap and drain repairs', 'plumbing')],
    question: 'How should I count AC units for the estimate?',
    answer: 'Count the indoor units you want inspected. If you cannot tell how many serve the property, send photos of the controls and describe the rooms so the team can clarify the scope.',
  },
  // https://www.emaar.com/en/our-communities/dubai-hills-estate
  {
    name: 'Dubai Hills', slug: 'dubai-hills',
    intro: 'Dubai Hills Estate includes apartments, villas and townhouses. The building or sub-community name helps distinguish a tower visit from repairs at a street-level home.',
    heading: 'Check finish matches before replacing a tile',
    detail: 'Photograph the damaged tile and a wider area of flooring in daylight. If you have a spare tile, photograph its back or its carton too. This helps the team assess whether an isolated replacement will blend with the rest of the room.',
    access: 'Give the apartment building or villa community and say where materials can be unloaded. For occupied homes, identify areas that need to stay usable.',
    services: [residential('Tile and grout repair', 'flooring'), residential('Cabinet adjustments', 'carpentry'), residential('Wall and ceiling painting', 'painting')],
    question: 'Can I use spare tiles left at handover?',
    answer: 'Tell us how many are available and send their dimensions. The technician can check the match and whether the quantity covers the repair before quoting.',
  },
  // https://www.emaar.com/en/our-communities/arabian-ranches
  {
    name: 'Arabian Ranches', slug: 'arabian-ranches',
    intro: 'The gated villa and townhouse communities of Arabian Ranches are easier to navigate with a phase and sub-community name. Include both as well as the street and villa number.',
    heading: 'Plan maintenance room by room',
    detail: 'For a villa maintenance visit, list each cooling unit, tap, drain or door needing attention against its room and floor. Mark any item that needs a separate visit because the space is occupied or the equipment is difficult to access.',
    access: 'Share the relevant gate and any visitor details that the resident needs to register. Mention whether anyone will be present to open utility rooms.',
    services: [residential('Villa cooling maintenance', 'hvac'), residential('Plumbing repairs', 'plumbing'), residential('Door and lock repairs', 'carpentry')],
    question: 'Can several villa repairs be included in one request?',
    answer: 'Yes. Send the complete list and identify the most urgent item. The team can advise which trades and materials are needed and which tasks can share a visit.',
  },
  // https://www.nakheel.com/en/developments/nakheel-projects/jumeirahvillagecircle
  {
    name: 'JVC', slug: 'jvc',
    intro: 'Jumeirah Village Circle includes apartment buildings and villas. A district or street pin plus the property name is useful when similar building names appear in a booking.',
    heading: 'Prepare a move-in fitting list',
    detail: 'For curtains, mirrors or shelving, send the size and weight of each item and a photo of its intended location. Note which brackets and fixings arrived with the product so the installer can assess what else may be needed.',
    access: 'Include the district if known, the building or villa name and the unit. Ask the owner or building manager about drilling hours before choosing a time.',
    services: [residential('Mounting and assembly', 'handyman'), residential('Carpentry adjustments', 'carpentry'), residential('Interior touch-ups', 'painting')],
    question: 'Can I book before furniture deliveries arrive?',
    answer: 'You can send the item list in advance. Confirm delivery, dimensions and the mounting hardware before the visit so the work can be planned against what is actually on site.',
  },
  // https://www.nakheel.com/en/developments/nakheel-projects/jumeirahvillagetriangle
  {
    name: 'JVT', slug: 'jvt',
    intro: 'Jumeirah Village Triangle has villas, townhouses and apartments. For an occupied family home, give the district, property type and the rooms where work is possible during the visit.',
    heading: 'Trace a bathroom issue before repairing the finish',
    detail: 'Tell us if water appears when the shower runs, when a basin drains or while everything is off. Photos of grout, cabinet bases and the adjoining wall help define which areas need inspection and which finishes may need repair.',
    access: 'Give the street or building pin and any side-gate instructions. If a bathroom cannot be taken out of use, explain which work window is practical.',
    services: [residential('Bathroom plumbing repairs', 'plumbing'), residential('Grout and tile repairs', 'flooring'), residential('Cabinet and door repairs', 'carpentry')],
    question: 'Should I arrange regrouting as soon as I see damp?',
    answer: 'Describe the damp patch first. Grout damage, a leaking fixture and moisture behind the wall may look similar from the surface but require different repairs.',
  },
  // https://www.propertyfinder.ae/en/area-insights/dubai/motor-city
  {
    name: 'Motor City', slug: 'motor-city',
    intro: 'Motor City includes the low-rise apartments of Uptown and the villas and townhouses of Green Community. Specify the development and building or street when arranging access.',
    heading: 'Assess doors before ordering hardware',
    detail: 'A balcony or internal door that drags can have a hinge, alignment or hardware problem. Supply a wide photo of the opening and a closer photo of the latch or track; tell us whether the door catches when opening, closing or locking.',
    access: 'For an apartment, include its block and entrance. For larger replacement parts, mention any delivery entrance or restricted parking near the property.',
    services: [residential('Door and joinery adjustments', 'carpentry'), residential('Fixture fitting', 'handyman'), residential('Flooring repairs', 'flooring')],
    question: 'Can a matching handle or hinge be sourced from a photo?',
    answer: 'Photos of the fitting and any model marking help identify it. A measurement or site check may still be necessary before a matching part can be priced.',
  },
  // https://www.dsc.ae/living/ and https://www.dsc.ae/about/
  {
    name: 'Sports City', slug: 'sports-city',
    intro: 'Dubai Sports City includes Canal Residence West and the residential communities of Victory Heights alongside its sports venues. State the residence or village name to distinguish the visit from a venue enquiry.',
    heading: 'Schedule repairs around occupied rooms',
    detail: 'For cooling or lighting repairs, tell us which room is affected and whether an adjacent room shares the fault. If the work is in a gym, studio or retail unit, include the hours when that area can be taken out of use.',
    access: 'Send the apartment block, villa village or commercial unit and the correct entrance. Include the keyholder’s availability for a vacant property.',
    services: [residential('Apartment and villa AC', 'hvac'), commercial('Lighting and electrical checks', 'electrical'), residential('Fixture installation', 'handyman')],
    question: 'Can a tenant request work while the owner is away?',
    answer: 'You can start an enquiry. Include the owner or manager’s approval process and identify who will give access and approve the quoted work.',
  },
  // https://www.dso.ae/documents/d/dubai-silicon-oasis/dubai-silicon-oasis-investor-guide
  {
    name: 'Dubai Silicon Oasis', slug: 'dubai-silicon-oasis',
    intro: 'Dubai Silicon Oasis brings workplaces and residential communities together, including the Cedre and Semmer villa communities. Identify whether the visit is for business premises, an apartment or a villa.',
    heading: 'Agree office downtime before an inspection',
    detail: 'For a workspace issue, name the affected room, fittings and occupied desks. Tell us which areas must remain in use during a visit and who can approve any interruption. A floor plan marked with the fault location can help with larger premises.',
    access: 'Provide the building or villa community, unit and reception contact. Mention any visitor registration instructions and the proposed access window.',
    services: [commercial('Office electrical checks', 'electrical'), commercial('Ceilings and partitions', 'ceilings'), residential('Villa AC maintenance', 'hvac')],
    question: 'Can the office facilities contact join the assessment?',
    answer: 'Yes. Include their available time and the items they want checked, especially where access to shared controls or ceiling spaces needs building coordination.',
  },
  // https://www.propertyfinder.ae/en/area-insights/dubai/mirdif-uptown-mirdif
  // https://www.propertyfinder.ae/en/buy/dubai/villas-for-sale-mirdif.html
  {
    name: 'Mirdif', slug: 'mirdif',
    intro: 'A Mirdif address may be a villa on a residential street or an apartment in a development such as Uptown Mirdif. Supply the compound or building name as well as the property number.',
    heading: 'Scope repainting in an occupied home',
    detail: 'List the rooms, approximate wall heights and any surfaces that need patching before paint. If some rooms must remain usable, note the preferred order and whether furniture will be in place during the work.',
    access: 'Tell us where materials can be set down and whether there are internal stairs. For a shared compound, include the villa identifier inside the gate.',
    services: [residential('Room painting and touch-ups', 'painting'), residential('Minor fixture repairs', 'handyman'), residential('Interior door adjustments', 'carpentry')],
    question: 'Can I request a paint match for one wall?',
    answer: 'Include the paint code or a photo of the original tin if available. A sample check can help determine whether a touch-up or repainting to a natural corner will give a closer match.',
  },
  // https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/deira
  {
    name: 'Deira', slug: 'deira',
    intro: 'Deira’s creekside trading streets and souks make the shop name, street and unloading point especially useful for commercial visits. For a home above a shop, identify its separate residential entrance.',
    heading: 'Plan retail work around trading hours',
    detail: 'For a shop lighting fault, list which signs, display lights or internal fittings need checking. If stock must be protected or moved to reach the area, flag this before the visit and identify who can give access.',
    access: 'Send a location pin, unit or shop number, and a nearby place to meet the site contact if vehicle access stops short of the door.',
    services: [commercial('Shop electrical repairs', 'electrical'), commercial('Retail fixture fitting', 'handyman'), commercial('Washroom plumbing', 'plumbing')],
    question: 'What if the technician cannot unload directly outside the shop?',
    answer: 'Share the nearest permitted unloading point and walking route. Let us know about stairs or narrow passages so the team can plan how to bring in tools and materials.',
  },
  // https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/bur-dubai
  {
    name: 'Bur Dubai', slug: 'bur-dubai',
    intro: 'Bur Dubai’s creekside district mixes shops and homes along busy squares and narrow streets. Give the building entrance and floor as well as the nearest landmark when arranging a repair.',
    heading: 'Allow for access when sizing the repair',
    detail: 'For damaged flooring or a ceiling patch, photograph the immediate damage and the full room. If matching the original finish matters, include a spare tile or a picture of the surrounding surface. Note any limits the owner has placed on the work.',
    access: 'Mention stairs, lift size and the distance from the unloading point when materials need carrying. Confirm who can meet the technician at the entrance.',
    services: [residential('Tile and flooring repair', 'flooring'), residential('Ceiling patch repairs', 'ceilings'), commercial('Interior painting', 'painting')],
    question: 'Can you estimate a small repair in an older building?',
    answer: 'Send photos, approximate dimensions and the requested finish. Access, material matching and the condition beneath the surface may need checking before a written price can be agreed.',
  },
];
