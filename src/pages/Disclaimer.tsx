import pageBg from "../assets/new-bg.png";

export default function Disclaimer() {
  const headingShadow = "0 6px 24px rgba(0,0,0,0.65)";
  const subShadow = "0 2px 12px rgba(0,0,0,0.55)";

  const Card = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md p-7 sm:p-8 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
      <h2
        className="text-xl sm:text-2xl font-extrabold text-white"
        style={{ textShadow: subShadow }}
      >
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-white/90 text-sm sm:text-base leading-relaxed">
        {children}
      </div>
    </section>
  );

  return (
    <main className="relative min-h-screen text-white">
      {/* ✅ Unified fixed background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${pageBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 sm:pt-28 pb-24">
        <p
          className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80 text-center"
          style={{ textShadow: subShadow }}
        >
          Legal
        </p>

        <h1
          className="mt-3 text-4xl sm:text-5xl font-extrabold text-center text-white"
          style={{ textShadow: headingShadow }}
        >
          DISCLAIMER & TERMS OF SERVICE
        </h1>

        <p
          className="mt-4 text-center text-white/85 max-w-3xl mx-auto"
          style={{ textShadow: subShadow }}
        >
          This page explains how our website and products may be used, and the limits
          of our responsibility. By using this website or buying from Vaal Exotics,
          you agree to the terms below.
        </p>

        <div className="mt-10 space-y-6">
          <Card title="1. General Information">
            <p>
              The information on this website is provided for general informational and
              educational purposes only. Products are sold subject to availability and
              applicable South African law.
            </p>
          </Card>

          {/* ✅ Anchor target for cookie popup link: /disclaimer#cookie-policy */}
          <div id="cookie-policy">
            <Card title="2. Cookie Policy">
              <p>
                This website uses cookies and similar technologies to ensure the site
                functions correctly, to improve performance, and to understand how visitors
                use our website.
              </p>

              <p>
                Cookies are small text files stored on your device when you visit a website.
                Some cookies are essential for core features (like remembering items in your cart),
                while others help with analytics or marketing.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white mt-2">
                Cookies we use
              </h3>

              <ul className="list-disc list-inside space-y-2">
                <li>
                  <span className="font-semibold text-white">Essential cookies:</span>{" "}
                  Required for the website to work properly (e.g. shopping cart, checkout,
                  security features, and preferences). These cannot be disabled without
                  affecting site functionality.
                </li>
                <li>
                  <span className="font-semibold text-white">Preference cookies:</span>{" "}
                  May remember your choices (such as cookie consent) so we don’t keep asking
                  you the same question.
                </li>
                <li>
                  <span className="font-semibold text-white">Analytics cookies (optional):</span>{" "}
                  Used to measure traffic and improve the website (for example, understanding
                  which pages are popular). These are only used if enabled on this site and,
                  where required, only with your consent.
                </li>
                <li>
                  <span className="font-semibold text-white">Marketing cookies (optional):</span>{" "}
                  Used to show relevant ads or measure marketing performance (for example,
                  Meta/Facebook Pixel). These are only used if enabled on this site and,
                  where required, only with your consent.
                </li>
              </ul>

              <h3 className="text-sm sm:text-base font-bold text-white mt-2">
                How to manage cookies
              </h3>

              <p>
                You can manage or delete cookies through your browser settings. Most browsers
                allow you to block cookies or alert you when cookies are being used. If you
                disable cookies, parts of the website (such as the cart or checkout) may not
                function correctly.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white mt-2">
                Third-party services
              </h3>

              <p>
                If we use third-party services (such as payment providers, analytics tools,
                or social media integrations), those services may set their own cookies or
                collect data according to their policies. Where required, we will only enable
                non-essential third-party cookies after you provide consent.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white mt-2">
                Contact
              </h3>

              <p>
                If you have questions about this Cookie Policy or how we use cookies, you can
                contact us at{" "}
                <span className="font-semibold text-white">info@vaalexotics.co.za</span>.
              </p>
            </Card>
          </div>

          <Card title="3. No Medical Advice">
            <p>
              Products sold under “Medicinal Supplements” or related categories are not
              intended to diagnose, treat, cure, or prevent any disease.
            </p>
            <p>
              Website content is not medical advice and should not replace professional
              healthcare consultation. Customers should consult a qualified healthcare
              professional before using supplements.
            </p>
          </Card>

          <Card title="4. Grow Kits & Cultivation Products">
            <p>
              Grow kits, grain cultures, and cultivation supplies are sold for legal
              purposes only.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>We do not promote illegal cultivation.</li>
              <li>We are not responsible for how products are used after purchase.</li>
              <li>
                We cannot guarantee results due to environmental variables outside our
                control.
              </li>
            </ul>
            <p>
              Customers are fully responsible for ensuring that use of any product
              complies with their local, provincial, and national laws.
            </p>
          </Card>

          <Card title="5. Product Use & Risk Assumption">
            <p>
              By purchasing from Vaal Exotics, the customer acknowledges that products
              are used at their own risk. Natural agricultural products may vary in
              outcome, and cultivation success depends on handling and environmental
              conditions.
            </p>
            <p>We are not liable for:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Improper use, misuse, negligence, or failure to follow instructions</li>
              <li>Allergic reactions or sensitivity to products</li>
              <li>Contamination caused after delivery</li>
              <li>Loss of crops or cultivation failure</li>
            </ul>
          </Card>

          <Card title="6. Limitation of Liability">
            <p>
              To the maximum extent permitted by South African law, Vaal Exotics, its
              owners, employees, and affiliates shall not be liable for indirect,
              incidental, or consequential damages, including loss of income, profit,
              crops, or other losses.
            </p>
            <p>
              If liability is proven, it is limited strictly to the value of the product
              purchased.
            </p>
          </Card>

          <Card title="7. Courier & Delivery">
            <p>
              Risk passes to the customer upon collection by the courier. We are not
              responsible for courier delays, damage during transit, incorrect delivery
              due to customer error, or loss once marked delivered.
            </p>
            <p>
              Courier charges are calculated based on weight brackets and may change
              without notice.
            </p>
          </Card>

          <Card title="8. Intellectual Property">
            <p>
              All content on this website including branding, text, logos, product
              descriptions, and images are the property of Vaal Exotics and may not be
              copied or reproduced without written consent.
            </p>
          </Card>

          <Card title="9. Website Use">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Misuse the website or attempt unauthorized access</li>
              <li>Use automated systems to scrape data</li>
              <li>Place fraudulent orders or provide false information</li>
            </ul>
            <p>We reserve the right to cancel suspicious or fraudulent transactions.</p>
          </Card>

          <Card title="10. Indemnity">
            <p>
              You agree to indemnify and hold harmless Vaal Exotics from any claims,
              damages, losses, liabilities, and expenses arising from improper use of
              products, violation of laws, breach of these terms, or misrepresentation
              of eligibility to purchase.
            </p>
          </Card>

          <Card title="11. Governing Law">
            <p>
              These terms are governed by the laws of the Republic of South Africa. Any
              disputes shall be subject to the jurisdiction of South African courts.
            </p>
          </Card>

          <Card title="12. Amendments">
            <p>
              Vaal Exotics reserves the right to amend these terms at any time without
              prior notice. Continued use of the website constitutes acceptance of the
              updated terms.
            </p>
          </Card>

          <div
            className="pt-2 text-center text-white/65 text-xs"
            style={{ textShadow: subShadow }}
          >
            Last updated: {new Date().toISOString().slice(0, 10)}
          </div>
        </div>
      </div>
    </main>
  );
}
