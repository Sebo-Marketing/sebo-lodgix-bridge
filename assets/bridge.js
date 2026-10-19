/**
 * Sebo Lodgix Bridge.
 *
 * Lodgix's embedded calendar asks the parent page for a Universal Analytics
 * linker (ga.getAll()[0].get('linkerParam')) when the visitor picks dates, and
 * puts the answer in its Book link as "&_ga=<value>". With GA4 there is no
 * `ga`, so the answer was empty. This answers with:
 *   - GA4's own cross-domain value (_gl), made by the site's Google tag by
 *     decorating a throwaway link to lodgix.com. Needs lodgix.com in the GA4
 *     stream's cross-domain list. Short-lived (about two minutes).
 *   - the visitor's ad source (gclid etc. and utm_*), "slx." + base64url JSON,
 *     which still credits the booking after _gl has expired. Read from Sebo
 *     Attribution's cookie when the site has it, else from this script's own
 *     first-party cookie, sebo_lxb, set when a visitor lands with one.
 * Joined by "~"; the Lodgix-side GTM container splits them back out.
 *
 * Also pushes lodgix_calendar_view and lodgix_quote to the dataLayer, for any
 * container that wants them.
 *
 * Add ?sebo_lodgix_debug=1 to a page to log what is sent to the console.
 */
(function () {
	'use strict';

	var LODGIX = 'https://www.lodgix.com';
	var COOKIE = 'sebo_lxb';
	var DEBUG = /[?&]sebo_lodgix_debug=1/.test(location.search);
	window.dataLayer = window.dataLayer || [];
	function log() { if (DEBUG && window.console) { console.log.apply(console, ['[Sebo Lodgix Bridge]'].concat([].slice.call(arguments))); } }

	// ---- Remember the ad source (sites without Sebo Attribution) ----------
	function readCookie(name) {
		var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
		if (!m) { return null; }
		try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
	}

	(function capture() {
		try {
			var q = new URLSearchParams(location.search);
			var d = readCookie(COOKIE) || {};
			var now = Math.floor(Date.now() / 1000);
			var changed = false;
			['gclid', 'gbraid', 'wbraid', 'msclkid'].forEach(function (k) {
				var v = q.get(k);
				if (v) { d[k] = { v: v.slice(0, 200), t: now }; changed = true; }
			});
			if (q.get('utm_source')) {
				d.utm = {};
				['source', 'medium', 'campaign', 'term', 'content'].forEach(function (k) {
					var v = q.get('utm_' + k);
					if (v) { d.utm[k] = v.slice(0, 100); }
				});
				d.utm.t = now;
				changed = true;
			}
			if (changed) {
				document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(d)) + '; Max-Age=' + (90 * 86400) + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
				log('stored source', d);
			}
		} catch (e) {}
	})();

	// ---- What to send ------------------------------------------------------
	// GA4's cross-domain value, produced by the Google tag's own link decorator.
	function ga4Linker() {
		try {
			var a = document.createElement('a');
			a.href = LODGIX + '/';
			a.style.display = 'none';
			document.body.appendChild(a);
			a.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
			var m = /[?&#]_gl=([^&#]+)/.exec(a.href);
			a.parentNode.removeChild(a);
			return m ? m[1] : '';
		} catch (err) {
			return '';
		}
	}

	function sourceFields() {
		var out = {};
		var now = Date.now() / 1000;
		var attr = readCookie('sebo_attr');
		if (attr) {
			// Sebo Attribution's cookie: ids.{gclid..}.{v,t}, last.{channel,source,...}
			['gclid', 'gbraid', 'wbraid', 'msclkid'].forEach(function (k) {
				var id = attr.ids && attr.ids[k];
				if (id && id.v && now - id.t < 90 * 86400) { out[k] = id.v; }
			});
			var last = attr.last;
			if (last && last.channel !== 'Direct' && last.source) {
				out.utm_source = last.source;
				out.utm_medium = last.medium || '(none)';
				['campaign', 'term', 'content'].forEach(function (k) { if (last[k]) { out['utm_' + k] = last[k]; } });
			}
			return out;
		}
		var own = readCookie(COOKIE);
		if (own) {
			['gclid', 'gbraid', 'wbraid', 'msclkid'].forEach(function (k) {
				if (own[k] && own[k].v && now - own[k].t < 90 * 86400) { out[k] = own[k].v; }
			});
			if (own.utm && own.utm.source) {
				out.utm_source = own.utm.source;
				out.utm_medium = own.utm.medium || '(none)';
				['campaign', 'term', 'content'].forEach(function (k) { if (own.utm[k]) { out['utm_' + k] = own.utm[k]; } });
			}
		}
		return out;
	}

	function storedSource() {
		try {
			var out = sourceFields();
			if (!Object.keys(out).length) { return ''; }
			// base64url, unpadded: Lodgix cuts its value at the first "=".
			var json = unescape(encodeURIComponent(JSON.stringify(out)));
			return 'slx.' + btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
		} catch (err) {
			return '';
		}
	}

	function linkerParam() {
		var value = [ga4Linker(), storedSource()].filter(Boolean).join('~');
		log('answering Lodgix with', value || '(nothing: no GA4 value and no stored source)');
		// The calendar reads "_ga=<value>" and keeps the value up to its next "=".
		return '_ga=' + value;
	}

	// ---- Answer Lodgix's ga.getAll() ----------------------------------------
	// Universal Analytics is retired, so `ga` only ever answers Lodgix here. If
	// a site still loads analytics.js, its calls are passed through to it.
	var tracker = { get: function (key) { return key === 'linkerParam' ? linkerParam() : undefined; } };
	function wrap(real) {
		var fn = function () { if (typeof real === 'function') { return real.apply(this, arguments); } };
		fn.getAll = function () { return [tracker]; };
		fn.getByName = function () { return tracker; };
		return fn;
	}
	var current = wrap(window.ga);
	try {
		Object.defineProperty(window, 'ga', {
			configurable: true,
			get: function () { return current; },
			set: function (v) { current = (v && v.getAll === current.getAll) ? v : wrap(v); }
		});
	} catch (e) {
		window.ga = current;
	}

	// ---- Events ---------------------------------------------------------------
	function propertyOf(frame) {
		if (!frame) { return ''; }
		var m = /\/properties\/(\d+)/.exec(frame.src || '');
		return frame.getAttribute('data-lodgix-property') || (m ? m[1] : '');
	}

	window.addEventListener('message', function (e) {
		if (e.origin !== LODGIX || typeof e.data !== 'string') { return; }
		var parts = e.data.split(',');
		if (parts[1] === '_ga') {
			var id = propertyOf(document.getElementById(parts[0]));
			log('Lodgix asked for the visitor (quote opened), property', id);
			window.dataLayer.push({ event: 'lodgix_quote', lodgix_property_id: id });
		}
	});

	function watchFrames() {
		Array.prototype.forEach.call(document.querySelectorAll('iframe[src^="' + LODGIX + '/booking-calendar"]'), function (f) {
			if (f.getAttribute('data-sebo-lxb')) { return; }
			f.setAttribute('data-sebo-lxb', '1');
			f.addEventListener('load', function () {
				log('calendar loaded, property', propertyOf(f));
				window.dataLayer.push({ event: 'lodgix_calendar_view', lodgix_property_id: propertyOf(f) });
			});
		});
	}
	document.addEventListener('DOMContentLoaded', watchFrames);
	window.addEventListener('load', watchFrames);
})();
