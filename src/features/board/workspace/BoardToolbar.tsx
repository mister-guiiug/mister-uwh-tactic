import {
  Armchair,
  ArrowUpRight,
  Footprints,
  Hand,
  ScanEye,
  Spline,
  View,
  Waves,
} from 'lucide-react';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { ARROW_KINDS, type ArrowKind } from '../model.ts';
import type { CameraPreset } from '../scene3d.ts';

export type View = '2d' | '3d' | 'both';
export type Tool = 'select' | ArrowKind;

interface Props {
  view: View;
  onView: (view: View) => void;
  /** « Côte à côte » n'a de sens que sur un écran large. */
  allowBoth: boolean;
  show2d: boolean;
  show3d: boolean;
  tool: Tool;
  onTool: (tool: Tool) => void;
  camera: CameraPreset;
  onCamera: (camera: CameraPreset) => void;
}

/**
 * Une option d'icône ET de mot : le mot se replie en texte masqué sur un
 * téléphone (`.uwh-seg__text`), il reste le nom accessible du segment. Un
 * segment d'icône seule devinerait ce qu'un « flick » veut dire.
 */
const option = (icon: ReactNode, text: string) => (
  <span className="uwh-seg">
    {icon}
    <span className="uwh-seg__text">{text}</span>
  </span>
);

const TOOL_ICON: Record<Tool, ReactNode> = {
  select: <Hand size={18} aria-hidden="true" />,
  move: <Footprints size={18} aria-hidden="true" />,
  pass: <ArrowUpRight size={18} aria-hidden="true" />,
  flick: <Spline size={18} aria-hidden="true" />,
};

/**
 * LES COMMANDES DE LA VUE, collées au tableau : quelle vue, et ce que fait
 * le doigt sur le terrain (l'outil) ou d'où l'on regarde (la caméra).
 * L'outil n'agit que sur la 2D, la caméra que sur la 3D : chacun ne paraît
 * qu'avec la vue qu'il pilote.
 */
export function BoardToolbar({
  view,
  onView,
  allowBoth,
  show2d,
  show3d,
  tool,
  onTool,
  camera,
  onCamera,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="uwh-toolbar">
      <SegmentedControl
        ariaLabel={t('board.view')}
        value={view}
        onChange={value => onView(value as View)}
        options={[
          { value: '2d', label: t('board.view2d') },
          { value: '3d', label: t('board.view3d') },
          ...(allowBoth ? [{ value: 'both', label: t('board.viewBoth') }] : []),
        ]}
      />
      {show2d ? (
        <SegmentedControl
          ariaLabel={t('board.tool')}
          value={tool}
          onChange={value => onTool(value as Tool)}
          options={[
            {
              value: 'select',
              label: option(TOOL_ICON.select, t('board.toolSelect')),
            },
            ...ARROW_KINDS.map(kind => ({
              value: kind,
              label: option(TOOL_ICON[kind], t(`arrows.${kind}`)),
            })),
          ]}
        />
      ) : null}
      {show3d ? (
        <SegmentedControl
          ariaLabel={t('board.camera')}
          value={camera}
          onChange={value => onCamera(value as CameraPreset)}
          options={[
            {
              value: 'tribune',
              label: option(
                <Armchair size={18} aria-hidden="true" />,
                t('board.cameraStand')
              ),
            },
            {
              value: 'dessus',
              label: option(
                <View size={18} aria-hidden="true" />,
                t('board.cameraTop')
              ),
            },
            {
              value: 'immersion',
              label: option(
                <Waves size={18} aria-hidden="true" />,
                t('board.cameraUnderwater')
              ),
            },
            {
              value: 'suivi',
              label: option(
                <ScanEye size={18} aria-hidden="true" />,
                t('board.cameraPov')
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
