export const PERMISSIONS = [
  "transports.view",
  "transports.edit",
  "transports.delete",
  "documents.view",
  "documents.edit",
  "financial.view",
  "collections.view",
  "social.view",
  "users.manage",
  "settings.manage",
  "values.view",
  "partners.view",
  "partners.manage",
] as const;

export type PermKey = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<PermKey, string> = {
  "transports.view": "Visualizar transportes",
  "transports.edit": "Editar transportes (criar, fotos, localização)",
  "transports.delete": "Excluir transportes",
  "documents.view": "Visualizar contratos & orçamentos",
  "documents.edit": "Editar contratos & orçamentos",
  "financial.view": "Acessar Financeiro",
  "collections.view": "Acessar Cobranças",
  "social.view": "Acessar Social & Marketing",
  "users.manage": "Gerenciar usuários",
  "settings.manage": "Configurações da empresa",
  "values.view": "Visualizar valores monetários",
  "partners.view": "Visualizar parceiros (motoristas)",
  "partners.manage": "Gerenciar parceiros (motoristas)",
};

export const COLLABORATOR_DEFAULTS: Record<PermKey, boolean> = {
  "transports.view": true,
  "transports.edit": true,
  "transports.delete": false,
  "documents.view": true,
  "documents.edit": false,
  "financial.view": false,
  "collections.view": false,
  "social.view": false,
  "users.manage": false,
  "settings.manage": false,
  "values.view": false,
  "partners.view": true,
  "partners.manage": false,
};

export const ALL_TRUE: Record<PermKey, boolean> = PERMISSIONS.reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {} as Record<PermKey, boolean>,
);
