export const enum ShapePathFormulasKeys {
  ROUND_RECT = 'roundRect',
  ROUND_RECT_DIAGONAL = 'roundRectDiagonal',
  ROUND_RECT_SINGLE = 'roundRectSingle',
  ROUND_RECT_SAMESIDE = 'roundRectSameSide',
  CUT_RECT_DIAGONAL = 'cutRectDiagonal',
  CUT_RECT_SINGLE = 'cutRectSingle',
  CUT_RECT_SAMESIDE = 'cutRectSameSide',
  CUT_ROUND_RECT = 'cutRoundRect',
  MESSAGE = 'message',
  ROUND_MESSAGE = 'roundMessage',
  L = 'L',
  RING_RECT = 'ringRect',
  PLUS = 'plus',
  TRIANGLE = 'triangle',
  PARALLELOGRAM_LEFT = 'parallelogramLeft',
  PARALLELOGRAM_RIGHT = 'parallelogramRight',
  TRAPEZOID = 'trapezoid',
  BULLET = 'bullet',
  INDICATOR = 'indicator',
  DONUT = 'donut',
  DIAGSTRIPE = 'diagStripe',
}

export const enum ElementTypes {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  LINE = 'line',
  CHART = 'chart',
  TABLE = 'table',
  LATEX = 'latex',
  VIDEO = 'video',
  AUDIO = 'audio',
}

/**
 * Gradient
 *
 * type: Gradient type (radial, linear)
 *
 * colors: Gradient colors (pos: percentage position; color: color)
 *
 * rotate: Gradient angle (linear gradients)
 */
export type GradientType = 'linear' | 'radial';
export type GradientColor = {
  pos: number;
  color: string;
};
export interface Gradient {
  type: GradientType;
  colors: GradientColor[];
  rotate: number;
}

export type LineStyleType = 'solid' | 'dashed' | 'dotted';

/**
 * Element shadow
 *
 * h: Horizontal offset
 *
 * v: Vertical offset
 *
 * blur: Blur amount
 *
 * color: Shadow color
 */
export interface PPTElementShadow {
  h: number;
  v: number;
  blur: number;
  color: string;
}

/**
 * Element border
 *
 * style?: Border style (solid or dashed)
 *
 * width?: Border width
 *
 * color?: Border color
 */
export interface PPTElementOutline {
  style?: LineStyleType;
  width?: number;
  color?: string;
}

export type ElementLinkType = 'web' | 'slide';

/**
 * Element hyperlink
 *
 * type: Link type (webpage, slide)
 *
 * target: Target address (URL or slide page ID)
 */
export interface PPTElementLink {
  type: ElementLinkType;
  target: string;
}

/**
 * Common element properties
 *
 * id: Element ID
 *
 * left: Horizontal position (distance from canvas left)
 *
 * top: Vertical position (distance from canvas top)
 *
 * lock?: Whether the element is locked
 *
 * groupId?: Group ID (elements with same groupId belong to one group)
 *
 * width: Element width
 *
 * height: Element height
 *
 * rotate: Rotation angle
 *
 * link?: Hyperlink
 *
 * name?: Element name
 */
interface PPTBaseElement {
  id: string;
  left: number;
  top: number;
  lock?: boolean;
  groupId?: string;
  width: number;
  height: number;
  rotate: number;
  link?: PPTElementLink;
  name?: string;
}

export type TextType =
  | 'title'
  | 'subtitle'
  | 'content'
  | 'item'
  | 'itemTitle'
  | 'notes'
  | 'header'
  | 'footer'
  | 'partNumber'
  | 'itemNumber';

/**
 * Text element
 *
 * type: Element type (text)
 *
 * content: Text content (HTML string)
 *
 * defaultFontName: （HTML）
 *
 * defaultColor: （HTML）
 *
 * outline?: 
 *
 * fill?: 
 *
 * lineHeight?: （），1.5
 *
 * wordSpace?: ，0
 *
 * opacity?: ，1
 *
 * shadow?: 
 *
 * paragraphSpace?: ， 5px
 *
 * vertical?: 
 *
 * textType?: 
 */
export interface PPTTextElement extends PPTBaseElement {
  type: 'text';
  content: string;
  defaultFontName: string;
  defaultColor: string;
  outline?: PPTElementOutline;
  fill?: string;
  lineHeight?: number;
  wordSpace?: number;
  opacity?: number;
  shadow?: PPTElementShadow;
  paragraphSpace?: number;
  vertical?: boolean;
  textType?: TextType;
}

/**
 * Image/shape flip options
 *
 * flipH?: Flip horizontally
 * flipV?: Flip vertically
 */
export interface ImageOrShapeFlip {
  flipH?: boolean;
  flipV?: boolean;
}

/**
 * Image filters (CSS filter values)
 *
 * Reference: https://developer.mozilla.org/docs/Web/CSS/filter
 *
 * blur?: Blur, default 0 (px)
 * brightness?: Brightness, default 100 (%)
 * contrast?: Contrast, default 100 (%)
 * grayscale?: Grayscale, default 0 (%)
 * saturate?: Saturation, default 100 (%)
 * hue-rotate?: Hue rotation, default 0 (deg)
 * opacity?: Opacity, default 100 (%)
 */
export type ImageElementFilterKeys =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'grayscale'
  | 'saturate'
  | 'hue-rotate'
  | 'opacity'
  | 'sepia'
  | 'invert';
export interface ImageElementFilters {
  blur?: string;
  brightness?: string;
  contrast?: string;
  grayscale?: string;
  saturate?: string;
  'hue-rotate'?: string;
  sepia?: string;
  invert?: string;
  opacity?: string;
}

export type ImageClipDataRange = [[number, number], [number, number]];

/**
 * Image clipping configuration
 *
 * range: Clipping range, e.g. [[10, 10], [90, 90]] means from 10%,10% to 90%,90%
 * shape: Clipping shape, see configs/image-clip.ts CLIPPATHS
 */
export interface ImageElementClip {
  range: ImageClipDataRange;
  shape: string;
}

export type ImageType = 'pageFigure' | 'itemFigure' | 'background';

/**
 * 
 *
 * type: （image）
 *
 * fixedRatio: 
 *
 * src: 
 *
 * outline?: 
 *
 * filters?: 
 *
 * clip?: 
 *
 * flipH?: 
 *
 * flipV?: 
 *
 * shadow?: 
 *
 * radius?: 
 *
 * colorMask?: 
 *
 * imageType?: 
 */
export interface PPTImageElement extends PPTBaseElement {
  type: 'image';
  fixedRatio: boolean;
  src: string;
  outline?: PPTElementOutline;
  filters?: ImageElementFilters;
  clip?: ImageElementClip;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  radius?: number;
  colorMask?: string;
  imageType?: ImageType;
}

export type ShapeTextAlign = 'top' | 'middle' | 'bottom';

/**
 * 
 *
 * content: （HTML）
 *
 * defaultFontName: （HTML）
 *
 * defaultColor: （HTML）
 *
 * align: （）
 *
 * lineHeight?: （），1.5
 *
 * wordSpace?: ，0
 *
 * paragraphSpace?: ， 5px
 *
 * type: 
 */
export interface ShapeText {
  content: string;
  defaultFontName: string;
  defaultColor: string;
  align: ShapeTextAlign;
  lineHeight?: number;
  wordSpace?: number;
  paragraphSpace?: number;
  type?: TextType;
}

/**
 * 
 *
 * type: （shape）
 *
 * viewBox: SVGviewBox， [1000, 1000] '0 0 1000 1000'
 *
 * path: ，SVG path d 
 *
 * fixedRatio: 
 *
 * fill: ，
 *
 * gradient?: ，
 *
 * pattern?: ，
 *
 * outline?: 
 *
 * opacity?: 
 *
 * flipH?: 
 *
 * flipV?: 
 *
 * shadow?: 
 *
 * special?: （， L Q C A ，）
 *
 * text?: 
 *
 * pathFormula?: 
 * ， viewBox ， viewBox path ，
 * ，， viewBox path 
 *
 * keypoints?: 
 */
export interface PPTShapeElement extends PPTBaseElement {
  type: 'shape';
  viewBox: [number, number];
  path: string;
  fixedRatio: boolean;
  fill: string;
  gradient?: Gradient;
  pattern?: string;
  outline?: PPTElementOutline;
  opacity?: number;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  special?: boolean;
  text?: ShapeText;
  pathFormula?: ShapePathFormulasKeys;
  keypoints?: number[];
}

export type LinePoint = '' | 'arrow' | 'dot';

/**
 * 
 *
 * type: （line）
 *
 * start: （[x, y]）
 *
 * end: （[x, y]）
 *
 * style: （、、）
 *
 * color: 
 *
 * points: （[, ]，：、、）
 *
 * shadow?: 
 *
 * broken?: （[x, y]）
 *
 * broken2?: （[x, y]）
 *
 * curve?: （[x, y]）
 *
 * cubic?: （[[x1, y1], [x2, y2]]）
 */
export interface PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> {
  type: 'line';
  start: [number, number];
  end: [number, number];
  style: LineStyleType;
  color: string;
  points: [LinePoint, LinePoint];
  shadow?: PPTElementShadow;
  broken?: [number, number];
  broken2?: [number, number];
  curve?: [number, number];
  cubic?: [[number, number], [number, number]];
}

export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'ring' | 'area' | 'radar' | 'scatter';

export interface ChartOptions {
  lineSmooth?: boolean;
  stack?: boolean;
}

export interface ChartData {
  labels: string[];
  legends: string[];
  series: number[][];
}

/**
 * Chart element
 *
 * type: Element type (chart)
 * fill?: Fill color
 * chartType: Base chart type (bar/line/pie)
 * data: Chart data
 * options: Extended options
 * outline?: Border
 * themeColors: Theme colors
 * textColor?: Axis/text color
 * lineColor?: Grid line color
 */
export interface PPTChartElement extends PPTBaseElement {
  type: 'chart';
  fill?: string;
  chartType: ChartType;
  data: ChartData;
  options?: ChartOptions;
  outline?: PPTElementOutline;
  themeColors: string[];
  textColor?: string;
  lineColor?: string;
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
/**
 * Table cell style
 *
 * bold?: Bold
 * em?: Italic
 * underline?: Underline
 * strikethrough?: Strikethrough
 * color?: Text color
 * backcolor?: Background color
 * fontsize?: Font size
 * fontname?: Font family
 * align?: Text alignment
 */
export interface TableCellStyle {
  bold?: boolean;
  em?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  backcolor?: string;
  fontsize?: string;
  fontname?: string;
  align?: TextAlign;
}

/**
 * Table cell
 *
 * id: Cell ID
 * colspan: Merged column count
 * rowspan: Merged row count
 * text: Text content
 * style?: Cell style
 */
export interface TableCell {
  id: string;
  colspan: number;
  rowspan: number;
  text: string;
  style?: TableCellStyle;
}

/**
 * Table theme
 *
 * color: Theme color
 * rowHeader: Header row
 * rowFooter: Footer row
 * colHeader: First column
 * colFooter: Last column
 */
export interface TableTheme {
  color: string;
  rowHeader: boolean;
  rowFooter: boolean;
  colHeader: boolean;
  colFooter: boolean;
}

/**
 * Table element
 *
 * type: Element type (table)
 * outline: Border
 * theme?: Theme
 * colWidths: Column width ratios, e.g. [0.3, 0.5, 0.2]
 * cellMinHeight: Minimum cell height
 * data: Table data
 */
export interface PPTTableElement extends PPTBaseElement {
  type: 'table';
  outline: PPTElementOutline;
  theme?: TableTheme;
  colWidths: number[];
  cellMinHeight: number;
  data: TableCell[][];
}

/**
 * LaTeX element (formula)
 *
 * type: Element type (latex)
 * latex: LaTeX code
 * html: KaTeX rendered HTML (new formula mode)
 * path: SVG path (legacy mode, backward compatible)
 * color: Color (legacy mode, backward compatible)
 * strokeWidth: Path width (legacy mode, backward compatible)
 * viewBox: SVG viewBox (legacy mode, backward compatible)
 * fixedRatio: Keep fixed aspect ratio
 * align: Horizontal alignment (left/center/right, default center)
 */
export interface PPTLatexElement extends PPTBaseElement {
  type: 'latex';
  latex: string;
  html?: string;
  path?: string;
  color?: string;
  strokeWidth?: number;
  viewBox?: [number, number];
  fixedRatio?: boolean;
  align?: 'left' | 'center' | 'right';
}

/**
 * Video element
 *
 * type: Element type (video)
 * src: Video URL
 * autoplay: Auto play
 * poster: Preview poster
 * ext: Video extension when URL has no suffix
 */
export interface PPTVideoElement extends PPTBaseElement {
  type: 'video';
  src: string;
  autoplay: boolean;
  poster?: string;
  ext?: string;
}

/**
 * Audio element
 *
 * type: Element type (audio)
 * fixedRatio: Keep fixed icon aspect ratio
 * color: Icon color
 * loop: Loop playback
 * autoplay: Auto play
 * src: Audio URL
 * ext: Audio extension when URL has no suffix
 */
export interface PPTAudioElement extends PPTBaseElement {
  type: 'audio';
  fixedRatio: boolean;
  color: string;
  loop: boolean;
  autoplay: boolean;
  src: string;
  ext?: string;
}

export type PPTElement =
  | PPTTextElement
  | PPTImageElement
  | PPTShapeElement
  | PPTLineElement
  | PPTChartElement
  | PPTTableElement
  | PPTLatexElement
  | PPTVideoElement
  | PPTAudioElement;

export type AnimationType = 'in' | 'out' | 'attention';
export type AnimationTrigger = 'click' | 'meantime' | 'auto';

/**
 * Element animation
 *
 * id: Animation ID
 * elId: Element ID
 * effect: Animation effect
 * type: Animation type (in/out/attention)
 * duration: Animation duration
 * trigger: Trigger mode (click/meantime/auto)
 */
export interface PPTAnimation {
  id: string;
  elId: string;
  effect: string;
  type: AnimationType;
  duration: number;
  trigger: AnimationTrigger;
}

export type SlideBackgroundType = 'solid' | 'image' | 'gradient';
export type SlideBackgroundImageSize = 'cover' | 'contain' | 'repeat';
export interface SlideBackgroundImage {
  src: string;
  size: SlideBackgroundImageSize;
}

/**
 * Slide background
 *
 * type: Background type (solid/image/gradient)
 * color?: Background color (solid)
 * image?: Image background
 * gradient?: Gradient background
 */
export interface SlideBackground {
  type: SlideBackgroundType;
  color?: string;
  image?: SlideBackgroundImage;
  gradient?: Gradient;
}

export type TurningMode =
  | 'no'
  | 'fade'
  | 'slideX'
  | 'slideY'
  | 'random'
  | 'slideX3D'
  | 'slideY3D'
  | 'rotate'
  | 'scaleY'
  | 'scaleX'
  | 'scale'
  | 'scaleReverse';

export interface SectionTag {
  id: string;
  title?: string;
}

export type SlideType = 'cover' | 'contents' | 'transition' | 'content' | 'end';

/**
 * Slide page
 *
 * id: Page ID
 * viewportSize: Viewport size
 * viewportRatio: Viewport aspect ratio
 * theme: Slide theme
 * elements: Element collection
 * background?: Page background
 * animations?: Element animations
 * turningMode?: Transition mode
 * sectionTag?: Section tag
 * type?: Page type
 */
export interface Slide {
  id: string;
  viewportSize: number;
  viewportRatio: number;
  theme: SlideTheme;
  elements: PPTElement[];
  background?: SlideBackground;
  animations?: PPTAnimation[];
  turningMode?: TurningMode;
  sectionTag?: SectionTag;
  type?: SlideType;
}

/**
 * Slide theme
 *
 * backgroundColor: Page background color
 * themeColors: Theme colors
 * fontColor: Font color
 * fontName: Font name
 */
export interface SlideTheme {
  backgroundColor: string;
  themeColors: string[];
  fontColor: string;
  fontName: string;
  outline?: PPTElementOutline;
  shadow?: PPTElementShadow;
}

export interface SlideTemplate {
  name: string;
  id: string;
  cover: string;
  origin?: string;
}

/**
 * @deprecated SlideData is deprecated, use Slide instead
 */
export interface SlideData {
  id: string;
  viewportSize: number;
  viewportRatio: number;
  theme: {
    themeColors: string[];
    fontColor: string;
    fontName: string;
    backgroundColor: string;
  };
  elements: PPTElement[];
  background?: SlideBackground;
  animations?: unknown[];
}
