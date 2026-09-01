export interface CosmicLineage {
  galaxyCluster: {
    id: string;
    name: string;
    type: 'Galaxy Cluster' | 'Galaxy Group' | 'Supercluster Node';
    galaxiesCount: number;
    diameterMly: string;
    description: string;
    isHomeCluster?: boolean;
  };
  galaxy: {
    name: string;
    type: string;
    diameterKly: string;
    starsCount: string;
    description: string;
  };
  galacticRegion: {
    name: string;
    distanceFromCore: string;
    temperature: string;
    description: string;
  };
  spiralArm: {
    name: string;
    pitchAngle: string;
    description: string;
  };
  starFormingRegion: {
    name: string;
    type: string;
    spanLy: string;
    protostarsCount: string;
    description: string;
  };
  stellarSystem: {
    starName: string;
    spectralClass: string;
    habitableZoneAU: string;
    worldsCount: number;
    description: string;
  };
}

export interface GalaxyClusterData {
  id: string;
  realityId: string;
  name: string;
  type: 'Galaxy Cluster' | 'Galaxy Group' | 'Supercluster Node';
  code: string;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  orbitIncl: number;
  galaxiesCount: number;
  isHomeCluster: boolean;
  lineage: CosmicLineage;
}
