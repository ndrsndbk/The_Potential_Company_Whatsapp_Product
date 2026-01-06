import { memo, useState, useEffect } from 'react';
import { Stamp } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, SendStampCardConfig } from '@/types/flow';

interface SendStampCardNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

const STAMP_SERVER_URL = 'https://stampgen.thepotentialcompany.com';

function SendStampCardNodeComponent({ data, selected }: SendStampCardNodeProps) {
  const config = data.config as SendStampCardConfig;
  const [templateInfo, setTemplateInfo] = useState<{
    name: string;
    title: string;
    total_stamps: number;
    background_color: string;
    accent_color: string;
  } | null>(null);

  // Load template info if using template
  useEffect(() => {
    if (config.useTemplate && config.templateId) {
      const loadTemplate = async () => {
        try {
          const token = localStorage.getItem('sb-auth-token') || '';
          const response = await fetch(`/api/stamp-templates/${config.templateId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            setTemplateInfo(data.template);
          }
        } catch (err) {
          console.error('Failed to load template:', err);
        }
      };
      loadTemplate();
    } else {
      setTemplateInfo(null);
    }
  }, [config.useTemplate, config.templateId]);

  const serverUrl = config.stampServerUrl || STAMP_SERVER_URL;

  return (
    <BaseNode data={data} selected={selected} icon={<Stamp size={16} />} color="#7c3aed">
      <div className="text-xs text-gray-500 space-y-1">
        {config.useTemplate && templateInfo ? (
          <>
            <div className="font-medium text-purple-700">{templateInfo.name}</div>
            <div className="w-full h-12 rounded overflow-hidden bg-gray-100">
              <img
                src={`${serverUrl}/generate-card?n=5&name=Preview&title=${encodeURIComponent(templateInfo.title)}&total=${templateInfo.total_stamps}&bg=${encodeURIComponent(templateInfo.background_color)}&accent=${encodeURIComponent(templateInfo.accent_color)}`}
                alt="Template"
                className="w-full h-full object-cover"
              />
            </div>
          </>
        ) : config.useTemplate && config.templateId ? (
          <div className="text-purple-600">Loading template...</div>
        ) : (
          <>
            <div>Stamps: {config.stampCount || 'Not set'}</div>
            <div>Name: {config.customerName || 'Not set'}</div>
            {config.title && <div className="truncate">Title: {config.title}</div>}
          </>
        )}
      </div>
    </BaseNode>
  );
}

export const SendStampCardNode = memo(SendStampCardNodeComponent);
