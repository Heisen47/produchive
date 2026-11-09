import React from 'react';
import type { CommunitySceneId, Occupant } from '../Shared3D';
import { ObservatoryEnv } from './Observatory';
import { WaterfallCafeEnv } from './WaterfallCafe';
import { GreenhouseEnv } from './Greenhouse';
import { LakesideEnv } from './Lakeside';
import { TeaGardenEnv } from './TeaGarden';
import { MountainLodgeEnv } from './MountainLodge';

const ENVS: Record<CommunitySceneId, React.FC<{ occupants: Occupant[]; accent: string }>> = {
  observatory: ObservatoryEnv,
  'waterfall-cafe': WaterfallCafeEnv,
  greenhouse: GreenhouseEnv,
  lakeside: LakesideEnv,
  'tea-garden': TeaGardenEnv,
  'mountain-lodge': MountainLodgeEnv,
};

/** Renders the scenery for a community room. `occupants` are the nearby people on local seats 0–11. */
export const CommunityEnv = ({ scene, occupants, accent }: { scene: CommunitySceneId; occupants: Occupant[]; accent: string }) => {
  const Env = ENVS[scene];
  return <Env occupants={occupants} accent={accent} />;
};
