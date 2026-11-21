#!/usr/bin/env python3
"""Builds the paid landing pages from the parts in tools/paid/.

    python3 tools/build_paid.py           write the pages
    python3 tools/build_paid.py --check   exit 1 if a page on disk differs from what the parts produce

The four landers share almost every section, so the sections live once in tools/paid/*.html and this
script stamps them into the pages. Edit the part, run the script, commit both. Never edit the built pages by hand:
the next build would undo it. Python 3, standard library only.

In a part:  {{name}}    is replaced by the page's value for that name (see PAGES below)
            {{> name}}  includes tools/paid/<name>.html (or the part the page maps that name to)
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS = os.path.join(ROOT, 'tools', 'paid')

BRAND = ('<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect x="3" y="5" width="26" height="24" rx="6" fill="#0d0f0e"/>'
         '<rect x="6" y="12" width="20" height="14" rx="3" fill="#fff"/><rect x="9.5" y="2" width="3" height="7" rx="1.5" fill="#fff"/>'
         '<rect x="19.5" y="2" width="3" height="7" rx="1.5" fill="#fff"/><rect x="15" y="15" width="8" height="8" rx="2" fill="#0F7A62"/>'
         '<path d="M16.9 19.1l1.5 1.5 2.8-3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')
ARROW = '<span class="k-btn__chip"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>'

COMMON = {
    'brand_svg': BRAND, 'arrow': ARROW,
    'sub': 'We work your dormant CRM first, then reach new people by email and LinkedIn. At least 15 attended, qualified meetings in your first <span class="p-nb">90 days</span> from launch, or we keep working at our cost.',
    'description': 'For independent RIAs with $50M to $250M+ AUM. At least 15 attended, qualified meetings in your first 90 days from launch, or we keep working at our cost. We start with the past prospects already in your CRM.',
}

LONG = ['sec-callout', 'sec-look', 'sec-week', 'sec-stuck', 'sec-mechanism', 'sec-different', 'sec-included', 'sec-extras',
        'sec-commitment', 'sec-pricing', 'sec-fit', 'sec-founder', 'sec-faq-long', 'sec-close']

PAGES = {
    # V1: the quiz on the first screen
    'ria-meetings.html': {
        'title': 'RIA appointment setting. Not leads. Attended meetings. | Advisor Booking',
        'css': ['kit', 'rm', 'paid', 'pd'], 'body_class': 'p p--quiz', 'preload': ['funnel'],
        'parts': ['hero-quiz'] + LONG, 'tail': 'tail-quiz',
        'map': {'mech_demo': 'stage-demo-inline'},
        'vars': {
            'cta_href': '#book', 'cta_attrs': '', 'bar_label': 'Start the fit check',
            'pb_eyebrow': 'Free with the fit check',
            'pb_get': '<strong>How to get it:</strong> finish the <a href="#book"><span class="p-nb">60-second</span> fit check</a> and we’ll email it to you, whether we’re a fit or not.',
            'cta1_label': 'Start the <span class="p-nb">60-second</span> <span class="p-nb">fit check</span>', 'cta1_fine': 'Five questions and your contact details. You get the free Past Prospect Playbook, fit or not.',
            'cta2_label': 'Start the fit check', 'cta2_fine': 'Five questions and your contact details. Then you pick a time for a <span class="p-nb">20-minute</span> call.',
            'cta3_label': 'Start the fit check', 'cta3_fine': 'Takes 60 seconds. You get the free Past Prospect Playbook, fit or not.',
            'faq_next_q': 'What happens after the fit check?',
            'faq_next_a': 'You pick a time for a <span class="p-nb">20-minute</span> call on Google Meet. It ends with a yes or a no. Either way, we email you the Past Prospect Playbook.',
        },
    },
    # V2: every button goes straight to the iClosed event
    'ria-meetings-direct.html': {
        'title': 'RIA appointment setting. Not leads. Attended meetings. | Advisor Booking',
        'css': ['kit', 'paid', 'pd'], 'body_class': 'p p--direct',
        'parts': ['hero-center'] + LONG, 'tail': 'tail',
        'map': {'hero_action': 'action-button', 'hero_stage': 'stage-demo', 'mech_demo': 'none'},
        'vars': {
            'hero_mode': 'demo',
            'cta_href': 'https://app.iclosed.io/e/advisorbooking/advisor-booking-meeting', 'cta_attrs': ' data-iclosed', 'bar_label': 'Book your fit call',
            'pb_sub': 'A step-by-step guide to restarting conversations with the past prospects in your CRM. Free when you book a 20-minute fit call.',
            'pb_fine': 'Book your call and we’ll email you the Playbook. <a href="#playbook">See what’s inside.</a>',
            'pb_eyebrow': 'Free with your fit call',
            'pb_get': '<strong>How to get it:</strong> <a href="https://app.iclosed.io/e/advisorbooking/advisor-booking-meeting" data-iclosed>book your fit call</a> and we’ll email it to you, whether we’re a fit or not.',
            'cta1_label': 'Book your fit call', 'cta1_fine': 'A few questions, then you pick a time. You get the free Past Prospect Playbook, fit or not.',
            'cta2_label': 'Book your fit call', 'cta2_fine': 'A few questions, then you pick a time.',
            'cta3_label': 'Book your fit call', 'cta3_fine': 'A few questions, then you pick a time. You get the free Past Prospect Playbook, fit or not.',
            'faq_next_q': 'What happens on the call?',
            'faq_next_a': '20 minutes on Google Meet. We look at your CRM, your current marketing and your goals, and how we’d set this up for your firm. It ends with a yes or a no.',
        },
    },
    # V3: the calendar on the page, under the first screen
    'ria-meetings-embed.html': {
        'title': 'RIA appointment setting. Not leads. Attended meetings. | Advisor Booking',
        'css': ['kit', 'rm-after', 'paid', 'pd'], 'body_class': 'p p--embed', 'preconnect': True,
        'parts': ['hero-center'] + LONG, 'tail': 'tail',
        'map': {'hero_action': 'action-button', 'hero_stage': 'stage-calendar', 'mech_demo': 'stage-demo-inline'},
        'vars': {
            'hero_mode': 'cal',
            'cta_href': '#schedule', 'cta_attrs': '', 'bar_label': 'Book your fit call',
            'pb_sub': 'A step-by-step guide to restarting conversations with the past prospects in your CRM. Free when you book a 20-minute fit call.',
            'pb_fine': 'Book your call and we’ll email you the Playbook. <a href="#playbook">See what’s inside.</a>',
            'pb_eyebrow': 'Free with your fit call',
            'pb_get': '<strong>How to get it:</strong> <a href="#schedule">book your fit call</a> and we’ll email it to you, whether we’re a fit or not.',
            'cta1_label': 'Book your fit call', 'cta1_fine': 'A few questions, then you pick a time. You get the free Past Prospect Playbook, fit or not.',
            'cta2_label': 'Book your fit call', 'cta2_fine': 'A few questions, then you pick a time.',
            'cta3_label': 'Book your fit call', 'cta3_fine': 'A few questions, then you pick a time. You get the free Past Prospect Playbook, fit or not.',
            'faq_next_q': 'What happens on the call?',
            'faq_next_a': '20 minutes on Google Meet. We look at your CRM, your current marketing and your goals, and how we’d set this up for your firm. It ends with a yes or a no.',
        },
    },
    # V4: the lead-magnet page. An email box, then the quiz at /fit-check
    'ria-playbook.html': {
        'title': 'RIA appointment setting. Not leads. Attended meetings. | Advisor Booking',
        'css': ['kit', 'paid', 'pd'], 'body_class': 'p p--email',
        'parts': ['hero-center', 'sec-facts', 'sec-look', 'sec-steps', 'sec-different', 'sec-commitment', 'sec-founder', 'sec-faq-short', 'sec-close-email'],
        'tail': 'tail',
        'map': {'hero_action': 'action-email', 'hero_stage': 'stage-demo'},
        'vars': {
            'hero_mode': 'demo',
            'cta_href': '#get', 'cta_attrs': '', 'bar_label': 'Get the free Playbook',
            'pb_sub': 'A step-by-step guide to restarting conversations with the past prospects in your CRM. Free. Tell us where to send it.',
            'pb_fine': 'Yours, fit or not. <a href="#playbook">See what’s inside.</a> Next is a <span class="p-nb">60-second</span> fit check.',
            'pb_eyebrow': 'The free Playbook',
            'pb_get': '<strong>How to get it:</strong> <a href="#get">enter your work email</a> and we’ll send it, whether we’re a fit or not.',
            'cta1_label': 'Get the free Playbook', 'cta1_fine': 'Your work email, then a <span class="p-nb">60-second</span> fit check.',
        },
    },
}


def part(name):
    with open(os.path.join(PARTS, name + '.html'), encoding='utf-8') as f:
        return f.read().rstrip('\n')


def render(text, page, depth=0):
    if depth > 8:
        raise SystemExit('parts include each other in a loop')

    def include(m):
        name = page.get('map', {}).get(m.group(2), m.group(2))
        if name == 'none':
            return ''
        body = render(part(name), page, depth + 1)
        pad = m.group(1)
        return '\n'.join((pad + line) if line else line for line in body.split('\n'))

    text = re.sub(r'^([ \t]*)\{\{>\s*([\w-]+)\s*\}\}[ \t]*$', include, text, flags=re.M)

    def var(m):
        k = m.group(1)
        v = page['vars'].get(k, COMMON.get(k))
        if v is None:
            raise SystemExit('no value for {{%s}} on a page that uses it' % k)
        return v

    return re.sub(r'\{\{(\w+)\}\}', var, text)


def build(name, page):
    page = dict(page, vars=dict(page['vars']))
    page['vars']['title'] = page['title']
    page['vars']['body_class'] = page['body_class']
    page['vars']['css'] = '\n'.join('<link rel="stylesheet" href="/assets/%s.css">' % c for c in page['css'])
    page['vars']['gads'] = '<script src="/assets/gads.js" async></script>'   # not in the part: /tools/paid/page.html must never start the tag
    # scripts the first screen cannot work without are asked for from the head, not when the end of the page arrives
    page['vars']['preconnect'] = (''.join('\n<link rel="preload" as="script" href="/assets/%s.js">' % j for j in page.get('preload', []))
                                  + ('\n<link rel="preconnect" href="https://app.iclosed.io">' if page.get('preconnect') else ''))
    sections = '\n\n'.join(render('{{> %s}}' % p, page) for p in page['parts'])
    page['vars']['sections'] = sections
    page['vars']['tail'] = render('{{> %s}}' % page['tail'], page)
    out = render(part('page'), page)
    out = re.sub(r'\n{3,}', '\n\n', out) + '\n'
    left = re.findall(r'\{\{[^}]*\}\}', out)
    if left:
        raise SystemExit('%s: unresolved %s' % (name, left[:3]))
    return out


def main():
    check = '--check' in sys.argv
    bad = 0
    for name, page in PAGES.items():
        out = build(name, page)
        path = os.path.join(ROOT, name)
        old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
        if check:
            if old != out:
                bad += 1
                print('out of date:', name)
        elif old != out:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(out)
            print('wrote', name)
        else:
            print('same ', name)
    if check and bad:
        sys.exit(1)


if __name__ == '__main__':
    main()
