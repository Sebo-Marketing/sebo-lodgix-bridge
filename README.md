# Sebo Lodgix Bridge

Keeps the visitor and their ad source when they book through an embedded
Lodgix calendar, so GA4 and Google Ads credit the reservation on lodgix.com to
the right source. No settings.

## Why

Lodgix's embedded calendar asks the page for a Universal Analytics linker when
a visitor picks dates, and adds the answer to its Book link. With GA4 there is
no `ga`, so the answer is empty and every checkout on lodgix.com starts as a
new visitor with no source ("Direct" or "Unassigned").

This plugin answers instead with:

- **GA4's cross-domain value (`_gl`)**, made by the site's own Google tag, so
  the checkout continues the same GA4 visitor and session.
- **The visitor's ad source** (gclid, gbraid, wbraid, msclkid, utm_*), so the
  booking is still credited after `_gl` expires (about two minutes). Read from
  Sebo Attribution's cookie when the site has it, otherwise from this plugin's
  own first-party cookie (`sebo_lxb`, 90 days), set when a visitor lands with
  a click ID or UTM tags.

It also pushes `lodgix_calendar_view` and `lodgix_quote` to the dataLayer.

It is the same bridge the Sebo theme carries; this plugin is for sites that
don't run that theme (the Utah Family Lodges sites before they move).

## Requirements (outside the plugin)

1. A GA4 Google tag on the site (gtag or GTM).
2. **lodgix.com** in that GA4 web stream's cross-domain list (Admin > Data
   streams > the stream > Configure tag settings > Configure your domains).
3. The Utah Family Lodges GTM container in Lodgix's tracking box, which turns
   the hand-off back into GA4's fields on lodgix.com and routes each Lodgix
   property to its lodge's GA4 property.

## Install

Download `sebo-lodgix-bridge.zip` from the latest release, upload it under
Plugins > Add New > Upload Plugin, and activate it (network-activate on a
multisite). Later versions arrive as ordinary plugin updates.

## Check it

Open a page with a Lodgix calendar and add `?sebo_lodgix_debug=1` to the
address. The browser console logs the calendar loading, the quote opening, and
the value handed to Lodgix: `_gl` first, then `slx.…` when a source is stored.

## Release

Bump `Version:` and `SEBO_LXB_VERSION` in `sebo-lodgix-bridge.php`, push to
`main`, and publish a GitHub release tagged `vX.Y.Z` with
`sebo-lodgix-bridge.zip` attached (`bash bin/build-zip.sh`).
