'use client'

import Script from 'next/script'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN

export default function AnalyticsScripts() {
  if (!GA_ID && !MIXPANEL_TOKEN) return null

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: false });
              `,
            }}
          />
        </>
      )}
      {MIXPANEL_TOKEN && (
        <Script
          src="https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js"
          strategy="afterInteractive"
          onLoad={() => {
            try {
              if (window.mixpanel) {
                window.mixpanel.init('${MIXPANEL_TOKEN}', {
                  debug: false,
                  track_pageview: false,
                  persistence: 'localStorage',
                })
              }
            } catch (e) {
              console.error('[Analytics] Mixpanel init failed', e)
            }
          }}
        />
      )}
    </>
  )
}
