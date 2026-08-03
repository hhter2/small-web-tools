import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import { NETWORK_SERVICES } from '../lib/thirdPartyServices';

export default function PrivacyPolicy() {
  const { t } = useTranslation('tools');
  return (
    <Card id="privacy" variant="tool" size="wide">
      <ToolHeader title={t('privacy.title')} />
      <div className="flex flex-col gap-4 text-sm text-text-main">
        <p>
          {t('privacy.ui.intro')}
        </p>
        <p>
          {t('privacy.ui.consentExplanation')}
        </p>
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="bg-app">
              <tr>
                {['service', 'purpose', 'data', 'mode'].map((heading) => (
                  <th key={heading} className="p-3 border-b border-border font-bold">{t(`privacy.ui.heading.${heading}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NETWORK_SERVICES.map((service) => (
                <tr key={service.id} className="align-top border-b border-border last:border-b-0">
                  <td className="p-3">
                    <strong>{t(`privacy.ui.services.${service.id}.name`)}</strong>
                    <div className="text-text-muted">{service.provider}</div>
                    <a href={service.policyUrl} target={service.policyUrl.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-accent hover:underline">
                      {t('privacy.ui.providerPolicy')}
                    </a>
                  </td>
                  <td className="p-3">{t(`privacy.ui.services.${service.id}.purpose`)}<div className="mt-1 text-text-muted">{t(`privacy.ui.services.${service.id}.trigger`)}</div></td>
                  <td className="p-3">{t(`privacy.ui.services.${service.id}.data`)}</td>
                  <td className="p-3">
                    <strong>{t(`privacy.ui.consentMode.${service.consentMode}`)}</strong>
                    <div className="mt-1 text-text-muted">{t(`privacy.ui.services.${service.id}.fallback`)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-muted">
          {t('privacy.ui.storageNote')}
        </p>
      </div>
    </Card>
  );
}
