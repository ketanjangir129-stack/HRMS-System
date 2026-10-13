import { useState } from "react";
import { FiChevronDown, FiHelpCircle } from "react-icons/fi";

export default function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: "How does selfie attendance verification eliminate proxy or buddy punching?",
      a: "When employees punch in or out, HRMS System activates the device camera and captures a live, un-mirrored real-orientation selfie synchronized with their real-time GPS coordinates. Managers can review punch photos directly in the Approval Queue with an interactive zoom lightbox.",
    },
    {
      q: "Do we need expensive biometric fingerprint or card scanning hardware?",
      a: "No hardware is needed. HRMS System operates smoothly on smartphones, tablets, laptops, and desktop browsers, saving your organization significant capital expenditure on physical biometric machines.",
    },
    {
      q: "How are punch photos and employee identity documents stored?",
      a: "All photos and onboarding documents are processed and secured via Cloudinary's encrypted CDN. Images are automatically compressed to high-efficiency WebP/AVIF formats to guarantee fast load times while preserving facial clarity.",
    },
    {
      q: "Can managers approve attendance and regularization on the go?",
      a: "Yes. The approval workspace is fully responsive and optimized for mobile screens. Managers can view punch timestamps, verify location pins on Google Maps, examine selfies, and click Approve or Reject with a single tap.",
    },
    {
      q: "How does HRMS System handle statutory payroll compliance?",
      a: "The system auto-calculates gross wages, net pay, and statutory deductions including Employee Provident Fund (EPF), Employee State Insurance (ESI), Professional Tax (PT), and Tax Deducted at Source (TDS), generating downloadable payslips instantly.",
    },
  ];

  return (
    <section className="py-20 bg-canvas border-t border-line">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
            <FiHelpCircle className="h-3.5 w-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-ink-subtle">
            Everything you need to know about getting started with HRMS System.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-line bg-surface overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 font-semibold text-ink hover:text-brand transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <FiChevronDown
                    className={`h-5 w-5 shrink-0 text-ink-subtle transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-brand" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-ink-subtle leading-relaxed border-t border-line/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

