import {
  Armchair,
  ArrowUpRight,
  CircleDashed,
  Footprints,
  Hand,
  Highlighter,
  ScanEye,
  Spline,
  SquareDashed,
  Type,
  View,
  Waves,
} from 'lucide-react';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { ARROW_KINDS, ZONE_SHAPES, type ZoneShape } from '../model.ts';
import type { BoardTool } from '../Board2D.tsx';
import type { CameraPreset } from '../scene3d.ts';

export type View = '2d' | '3d' | 'both';
export type Tool = 'select' | BoardTool;

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
  /** La forme des zones, choisie à côté de l'outil « Zone » (ADR 0026). */
  zoneShape: ZoneShape;
  onZoneShape: (shape: ZoneShape) => void;
}

/**
 * Une option d'icône ET de mot. Au téléphone, le mot passe sous l'icône
 * (ADR 0017) — il disparaissait, et un segment d'icône seule laissait
 * deviner ce qu'un « flick » veut dire. Quand le mot est long, une forme
 * courte s'affiche (« Déplacer ») ; la longue reste le nom accessible.
 */
const option = (icon: ReactNode, text: string, short?: string) => (
  <span className="uwh-seg">
    {icon}
    <span
      className={short ? 'uwh-seg__text uwh-seg__text--long' : 'uwh-seg__text'}
    >
      {text}
    </span>
    {short ? (
      <span className="uwh-seg__text uwh-seg__short" aria-hidden="true">
        {short}
      </span>
    ) : null}
  </span>
);

const TOOL_ICON: Record<Tool, ReactNode> = {
  select: <Hand size={18} aria-hidden="true" />,
  move: <Footprints size={18} aria-hidden="true" />,
  pass: <ArrowUpRight size={18} aria-hidden="true" />,
  flick: <Spline size={18} aria-hidden="true" />,
  zone: <Highlighter size={18} aria-hidden="true" />,
  word: <Type size={18} aria-hidden="true" />,
};

const SHAPE_ICON: Record<ZoneShape, ReactNode> = {
  ellipse: <CircleDashed size={18} aria-hidden="true" />,
  rect: <SquareDashed size={18} aria-hidden="true" />,
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
  zoneShape,
  onZoneShape,
}: Props) {
  const { t } = useI18n();
  /*
   * LA FORME PARAÎT AU BOUT DE LA RANGÉE, qui défile au téléphone : elle
   * vient sous le doigt au lieu de naître hors de l'écran.
   */
  const shapes = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tool === 'zone') {
      shapes.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [tool]);
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
              label: option(
                TOOL_ICON.select,
                t('board.toolSelect'),
                t('board.toolSelectShort')
              ),
            },
            ...ARROW_KINDS.map(kind => ({
              value: kind,
              label: option(
                TOOL_ICON[kind],
                t(`arrows.${kind}`),
                kind === 'move' ? t('board.toolMoveShort') : undefined
              ),
            })),
            // Ombrer une zone, poser un mot : à côté des flèches (ADR 0026).
            {
              value: 'zone',
              label: option(TOOL_ICON.zone, t('marks.toolZone')),
            },
            {
              value: 'word',
              label: option(TOOL_ICON.word, t('marks.toolWord')),
            },
          ]}
        />
      ) : null}
      {show2d && tool === 'zone' ? (
        <div ref={shapes}>
          <SegmentedControl
            ariaLabel={t('marks.shape')}
            value={zoneShape}
            onChange={value => onZoneShape(value as ZoneShape)}
            options={ZONE_SHAPES.map(shape => ({
              value: shape,
              label: option(SHAPE_ICON[shape], t(`marks.${shape}`)),
            }))}
          />
        </div>
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
                t('board.cameraUnderwater'),
                t('board.cameraUnderwaterShort')
              ),
            },
            {
              value: 'suivi',
              label: option(
                <ScanEye size={18} aria-hidden="true" />,
                t('board.cameraPov'),
                t('board.cameraPovShort')
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
