import React from 'react';

/** Original E3 vector artwork; only whitespace and dark-theme wordmark are adapted. */
export function BrandLogo() {
  return <span className="e3-brand" role="img" aria-label="E3 EOS — Events & Entertainment Enterprises">
    <img className="e3-brand-light" src="/brand/e3-light.svg" alt="E3 Events & Entertainment Enterprises" />
    <img className="e3-brand-dark" src="/brand/e3-dark.svg" alt="" aria-hidden="true" />
    <img className="e3-brand-mark" src="/brand/e3-mark.svg" alt="" aria-hidden="true" />
  </span>;
}
