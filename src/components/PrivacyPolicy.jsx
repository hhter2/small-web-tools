import React from 'react';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import { NETWORK_SERVICES } from '../lib/thirdPartyServices';

const CONSENT_LABELS = {
  'explicit-consent': 'Explicit consent',
  'point-of-use-disclosure': 'Point-of-use disclosure',
  'user-navigation': 'User navigation',
  'hosting-infrastructure': 'Hosting infrastructure',
};

export default function PrivacyPolicy() {
  return (
    <Card id="privacy" variant="tool" size="wide">
      <ToolHeader title="Privacy & Network Services" />
      <div className="flex flex-col gap-4 text-sm text-text-main">
        <p>
          Small Web Tools is local-first: most tool inputs and selected files stay in your browser.
          Features that need a server, remote data, a runtime asset, or external navigation are listed below.
        </p>
        <p>
          Explicit-consent services remain blocked until allowed in the consent manager. A point-of-use
          disclosure explains a required request before an action starts. External navigation occurs only
          when you select a link.
        </p>
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="bg-app">
              <tr>
                {['Service', 'Purpose and trigger', 'Data sent', 'Mode and fallback'].map((heading) => (
                  <th key={heading} className="p-3 border-b border-border font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NETWORK_SERVICES.map((service) => (
                <tr key={service.id} className="align-top border-b border-border last:border-b-0">
                  <td className="p-3">
                    <strong>{service.name}</strong>
                    <div className="text-text-muted">{service.provider}</div>
                    <a href={service.policyUrl} target={service.policyUrl.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-accent hover:underline">
                      Provider policy
                    </a>
                  </td>
                  <td className="p-3">{service.purpose}<div className="mt-1 text-text-muted">{service.trigger}</div></td>
                  <td className="p-3">{service.dataTransmitted}</td>
                  <td className="p-3">
                    <strong>{CONSENT_LABELS[service.consentMode]}</strong>
                    <div className="mt-1 text-text-muted">{service.fallback}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-muted">
          Consent choices are stored only in this browser. Resetting or revoking consent removes permission
          for future requests; already completed network requests cannot be recalled.
        </p>
      </div>
    </Card>
  );
}
