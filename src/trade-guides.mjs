export const tradeGuides = {
  hvac: {
    title: 'Cooling, airflow and AC servicing',
    preparation: 'List the affected units and rooms. Note when the cooling changes, whether airflow drops, and any noise or water you have noticed. Include a photo of the unit label if it is easily visible.',
    handover: 'Ask the technician to show which units were serviced, how each responds to its controls, and any filter, drainage or parts work that still needs approval.',
    faq: [
      ['Should I count rooms or AC units?', 'Count the units you want serviced. If one ducted system serves several rooms, describe the system and list the rooms with poor cooling.'],
      ['Does routine AC servicing include duct cleaning?', 'Duct cleaning has a separate scope. Mention dust at the grilles or uneven airflow so the technician can assess the ducts and identify the work to include.'],
    ],
    sectorFaq: {
      residential: ['What if my building supplies chilled water?', 'Tell us which rooms are affected and whether building management has reported an interruption. This helps define which checks fall inside the apartment.'],
      commercial: ['Can I group several office units into one visit?', 'Share the unit count, zones and occupied hours. The quote can separate routine servicing from faults and identify areas that need a different access window.'],
      industrial: ['Can I request cooling work for a warehouse office?', 'Identify the office or occupied zone and share the access height. Describe any process cooling separately so dispatch can confirm whether it is within scope.'],
    },
  },
  plumbing: {
    title: 'Leaks, drainage and water fittings',
    preparation: 'Identify the fixture and room, when you first noticed the issue, and whether nearby fixtures are affected. A photo of the visible leak, staining or damaged fitting helps define the visit.',
    handover: 'Review the repaired fitting with the technician. Ask which points were checked for visible leaks or drainage and whether opening a wall or restoring a finish needs a separate quote.',
    faq: [
      ['What should I include for a recurring leak?', 'Note when it appears, such as after a shower or while a tap runs, and whether the stain has spread. Photos taken at different times can help the technician trace the source.'],
      ['Does the quote include a replacement tap or mixer?', 'Specify whether you are supplying the fitting. The written quote can identify the replacement model, labour and any additional connections before you approve it.'],
    ],
    sectorFaq: {
      residential: ['What if a neighbouring apartment is affected?', 'Mention the affected apartments and give a building-management contact if available. Access to a shared riser or another unit may affect the inspection.'],
      commercial: ['Can one washroom stay open during repairs?', 'Share the layout, available washrooms and opening hours. Dispatch can discuss which fixtures might need isolation and agree a work window.'],
      industrial: ['What details help scope a warehouse drainage issue?', 'Describe the affected washroom, pantry or utility area, the type of drain and nearby vehicle routes. Identify any process drainage separately when requesting the visit.'],
    },
  },
  electrical: {
    title: 'Lighting, fittings and fault assessment',
    preparation: 'List the affected lights, sockets or areas and when the issue occurs. Include fixture photos taken from normal room access and note any restrictions on interrupting power.',
    handover: 'Review the fittings covered by the quote and ask which operations were checked after the repair. Record any circuits or replacement parts that need further attention.',
    faq: [
      ['What if a fault comes and goes?', 'Describe the time, the rooms affected and what was in use when you noticed it. This gives the technician a starting point even if everything works during the visit.'],
      ['Can I supply my own light fitting?', 'Include the model, dimensions and mounting details with the enquiry. The technician can review compatibility, access and labour before the installation is quoted.'],
    ],
    sectorFaq: {
      residential: ['What if several rooms lose lighting together?', 'Name the rooms and tell us if other homes or shared corridors were affected. Mention any notice from building management when requesting the assessment.'],
      commercial: ['How should we plan work around tills or office systems?', 'Identify essential equipment and the access window approved by the site manager. The team can agree any interruption with your contact before work begins.'],
      industrial: ['Can you assess a high-level lighting fault?', 'Share the approximate mounting height, floor access and traffic restrictions. The scope can account for access equipment and site coordination.'],
    },
  },
  painting: {
    title: 'Wall preparation, colour and finish',
    preparation: 'List the rooms and surfaces, including any ceilings or doors. Share the colour code, finish and photos of cracks, stains or old touch-ups. Note where furniture will remain in place.',
    handover: 'Review the agreed surfaces in the room lighting. Check coverage, edges and repaired areas, and keep a note of the colour and finish for future touch-ups.',
    faq: [
      ['Can a small patch match the surrounding paint?', 'Paint can change appearance with age and light. A colour code or leftover paint helps with matching. The quote can give a whole-wall option if a patch is likely to show.'],
      ['What changes the cost for a room?', 'Wall area, surface condition, access and the change in colour affect the scope. Identify preparation, ceilings and woodwork separately so you can compare the quoted work.'],
    ],
    sectorFaq: {
      residential: ['What should I share for a move-out repaint?', 'Send the handover date, room photos and any finish or colour required by the landlord. Identify marks, fixing holes and walls where the original colour is unknown.'],
      commercial: ['Can work be split between occupied areas?', 'List the rooms in priority order and share opening hours and access restrictions. The quote can allow for separate work areas and visits.'],
      industrial: ['Can you price a warehouse wall from its floor area?', 'Wall height and the clear space beside each wall are also needed. Mention racking, operating zones and any specified coating so the scope can be assessed.'],
    },
  },
  carpentry: {
    title: 'Door adjustments, hardware and joinery',
    preparation: 'Identify each door, drawer or cabinet and describe where it sticks, moves or fails to latch. Photos showing the full item and its hardware help the team assess matching parts.',
    handover: 'Open and close the repaired item during handover. Check movement, alignment and latch operation, and compare any visible replacement hardware with the agreed finish.',
    faq: [
      ['Can a sticking door be adjusted?', 'The technician can assess the hinges, frame and rubbing point. The quote will depend on whether an adjustment, hardware replacement or wider repair is needed.'],
      ['Can replacement handles match the existing ones?', 'Send a photo and any available model or finish details. If the original item is unavailable, review the proposed alternative before ordering.'],
    ],
    sectorFaq: {
      residential: ['Can you assess several kitchen cabinet doors together?', 'List affected doors, drawers and hinges, including which ones rub or hang loosely. A photo of the full run helps show alignment across neighbouring units.'],
      commercial: ['What should we specify for office door work?', 'Identify which doors are used by staff or customers, their hardware and any access-control or building requirements. This helps determine the appropriate trade and work window.'],
      industrial: ['What type of door should we identify in the enquiry?', 'State whether it is an office door, cabinet, fire-rated assembly or loading door. The team can confirm the scope and route specialist equipment separately.'],
    },
  },
  handyman: {
    title: 'Mounting, assembly and small repairs',
    preparation: 'Send one list with the location and quantity for each task. For mounting or assembly, include item dimensions, approximate weight, model details and photos of the intended position.',
    handover: 'Walk through the task list together. Check the agreed positions and alignment, try moving parts on assembled items, and note any task deferred for specialist assessment.',
    faq: [
      ['Can I combine several small jobs in one enquiry?', 'Yes. List each task and quantity so dispatch can assess the time, tools and fittings together. Flag items with a specific installation height or access restriction.'],
      ['What do you need to assess TV or mirror mounting?', 'Share the item and bracket model, dimensions and preferred position. Mention the wall material if known so the technician can assess the fixing method.'],
    ],
    sectorFaq: {
      residential: ['What if my landlord restricts drilling?', 'Include the permission or restrictions in your enquiry and identify the wall. This lets the team assess the proposed mounting position before scheduling.'],
      commercial: ['Can I request assembly before an office move?', 'Include the furniture list, model numbers, delivery date and floor access. Tell us which rooms need to be ready first so the work can be scoped in that order.'],
      industrial: ['Can we combine repairs across a workshop and office?', 'Separate tasks by work zone and list induction or access requirements. Identify any work near machinery so dispatch can assess the building-maintenance portion.'],
    },
  },
  ceilings: {
    title: 'Ceiling repairs, partitions and access panels',
    preparation: 'Share a photo of the whole ceiling or partition and a close view of the affected area. Include approximate dimensions, access height and the position of lights, grilles or access hatches.',
    handover: 'Review joint lines, edges and the agreed finish. Where an access panel was included, check that it opens and that the intended building service remains accessible.',
    faq: [
      ['Can you patch only the damaged section?', 'A local repair may suit an isolated defect. The technician will assess the surrounding board, joint condition and any unresolved leak before defining the repair area.'],
      ['Does the partition quote cover painting and fixtures?', 'Identify the finish, doors, sockets and other fixtures required. The quote can separate partition work from painting and changes to building services.'],
    ],
    sectorFaq: {
      residential: ['What should I tell you about a stained bathroom ceiling?', 'Mention whether building management or a plumber has checked the moisture source. Include photos and identify any nearby access hatch or ventilation grille.'],
      commercial: ['What helps price an office partition layout?', 'Share a marked plan with approximate lengths, ceiling height and door positions. Include the landlord’s access conditions and the required finish on each side.'],
      industrial: ['What should we include for a partition inside a facility?', 'Describe the proposed rooms, height, nearby building services and any site-specific requirements. Dispatch can confirm suitable scope and access before arranging a survey.'],
    },
  },
  flooring: {
    title: 'Tile replacement, grout and floor finishes',
    preparation: 'Share the area, approximate dimensions, floor type and a photo of the damage. For a tile repair, include the tile size, whether it moves and whether matching spare tiles are available.',
    handover: 'Review the agreed repair area, visible finish, grout lines, edges and transitions. Ask when the specific materials used can take foot traffic, cleaning or heavier loads.',
    faq: [
      ['Can you replace an individual tile?', 'The technician can assess an isolated tile and the condition underneath. A matching spare helps preserve the pattern and colour across the repair.'],
      ['Will fresh grout solve a loose tile?', 'Movement affects the repair scope. Mention any loose or lifting tiles so the technician can assess the base as well as the visible grout.'],
    ],
    sectorFaq: {
      residential: ['Can you match a bathroom floor when I have no spare tile?', 'Share photos, dimensions and any manufacturer information. The team can discuss a close match or a wider replacement area before you choose the finish.'],
      commercial: ['How do we keep a shop entrance accessible?', 'Describe the traffic route and any alternate entrance. Ask for a staged work window that accounts for removal, installation and the material’s return-to-use time.'],
      industrial: ['What information matters for a floor used by trolleys?', 'Describe the floor finish, vehicle or trolley traffic, damaged area and available downtime. This helps assess whether the repair needs a specialist flooring system.'],
    },
  },
};
