export interface ModuleManifest {
  name: string;
  icon: string;
  route: string;
  order: number;
}

export interface ModuleDefinition extends ModuleManifest {
  id: string;
  component: React.ComponentType<{ onNavigate?: (route: string) => void }>;
}
