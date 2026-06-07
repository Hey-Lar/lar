import type { CSSProperties, SVGProps } from 'react';
import { ICONS, type IconName, type IconShape } from './registry';

export type IconDirection = 'right' | 'down' | 'left' | 'up';

export interface IconProps {
  /** Which glyph to render (see `IconName`). */
  name: IconName;
  /** Width + height in px. Default 20. */
  size?: number;
  /** Stroke weight. Default 1.75 (the Lar family weight). */
  strokeWidth?: number;
  /**
   * Rotate a single base glyph via CSS. `right` (default) is the authored
   * orientation; `down`/`left`/`up` rotate 90/180/270°. Intended for `chevron`.
   */
  direction?: IconDirection;
  /**
   * Accessible label. Omit for a decorative icon (`aria-hidden`); provide to
   * mark the icon meaningful (`role="img"` + `aria-label` + `<title>`).
   */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const ROTATION: Record<IconDirection, string> = {
  right: 'rotate(0deg)',
  down: 'rotate(90deg)',
  left: 'rotate(180deg)',
  up: 'rotate(270deg)',
};

function renderShape(shape: IconShape, i: number) {
  // `vector-effect: non-scaling-stroke` keeps the optical weight constant at
  // every render size. Geometry-only — paint comes from the parent <svg>.
  const ve = { vectorEffect: 'non-scaling-stroke' as const };
  switch (shape.tag) {
    case 'path':
      return <path key={i} d={shape.d} {...ve} />;
    case 'circle':
      return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} {...ve} />;
    case 'rect':
      return (
        <rect
          key={i}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          ry={shape.ry}
          {...ve}
        />
      );
    case 'line':
      return <line key={i} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...ve} />;
    case 'polyline':
      return <polyline key={i} points={shape.points} {...ve} />;
    case 'polygon':
      return <polygon key={i} points={shape.points} {...ve} />;
  }
}

/**
 * Lar's custom stroke icon. Renders a glyph from the registry into a 24×24
 * viewBox at `size` px, painted entirely with `currentColor` (no color prop —
 * it inherits `--ink`/`--hearth` from an ancestor `color`). See DESIGN.md §4.
 */
export function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  direction = 'right',
  title,
  className,
  style,
}: IconProps) {
  const shapes = ICONS[name];
  const decorative = title === undefined;
  const transform = direction !== 'right' ? ROTATION[direction] : undefined;

  const a11y: SVGProps<SVGSVGElement> = decorative
    ? { 'aria-hidden': true, focusable: false }
    : { role: 'img', 'aria-label': title };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={transform ? { transform, ...style } : style}
      {...a11y}
    >
      {title !== undefined ? <title>{title}</title> : null}
      {shapes.map((shape, i) => renderShape(shape, i))}
    </svg>
  );
}
