import InitCanvasKit from 'canvaskit-wasm';

const CanvasKit = await InitCanvasKit();

export default class ImageBuilder {
  constructor(fonts) {
    // Set values
    const background = CanvasKit.WHITE;
    const color = CanvasKit.BLACK;
    const borderWidth = 39;
    const borderColor = CanvasKit.Color(187, 187, 187);
    const fontSize = 26;
    const lineHeight = 1.5;
    const padding = 52;
    const offsetWidth = 900;

    // Calculate values
    const offsetMinHeight = Math.round(offsetWidth / 2);
    const offsetMinSpace = (padding * 2) + (borderWidth * 2) + (fontSize * (lineHeight - 1) / 2);
    const clientStartX = borderWidth;
    const clientEndX = offsetWidth - borderWidth;
    const clientStartY = borderWidth;
    const contentWidth = offsetWidth - (borderWidth * 2) - (padding * 2);
    const contentStartX = borderWidth + padding;

    const mgr = CanvasKit.FontMgr.FromData(fonts);
    const style = new CanvasKit.ParagraphStyle({
      textAlign: CanvasKit.TextAlign.Center,
      textStyle: {
        color: color,
        fontFamilies: fonts.map((_, i) => mgr.getFamilyName(i)),
        fontSize: fontSize,
        heightMultiplier: lineHeight,
      },
    });
    const paint = new CanvasKit.Paint();
    paint.setColor(background);

    Object.assign(this, {
      borderWidth,
      borderColor,
      padding,
      offsetWidth,
      offsetMinHeight,
      offsetMinSpace,
      clientStartX,
      clientEndX,
      clientStartY,
      contentWidth,
      contentStartX,
      mgr,
      style,
      paint,
    });
  }

  generate(text) {
    const {
      borderWidth,
      borderColor,
      padding,
      offsetWidth,
      offsetMinHeight,
      offsetMinSpace,
      clientStartX,
      clientEndX,
      clientStartY,
      contentWidth,
      contentStartX,
      mgr,
      style,
      paint,
    } = this;

    // Normalize whitespaces of text
    text = (() => {
      let txt = text.trim();
      let sol = true;
      let res = '';
      let buf = '';
      for (const ch of txt) {
        switch (ch) {
        case '\r':
          break;
        case '\t':
        case ' ':
          if (!sol) buf = ' ';
          break;
        case '\n':
          res += ch;
          buf = '';
          sol = true;
          break;
        default:
          res += buf + ch;
          buf = '';
          sol = false;
          break;
        }
      }
      return res;
    })();

    const builder = CanvasKit.ParagraphBuilder.Make(style, mgr);
    builder.addText(text);
    const content = builder.build();
    content.layout(contentWidth);

    // Calculate values
    const contentHeight = content.getHeight();
    const offsetHeight = Math.max(offsetMinHeight, contentHeight + offsetMinSpace);
    const clientEndY = offsetHeight - borderWidth;
    const contentStartY =
      (offsetHeight === offsetMinHeight) ?
      clientStartY + (clientEndY - clientStartX - contentHeight) / 2 :
      clientStartY + padding;

    const surface = CanvasKit.MakeSurface(offsetWidth, offsetHeight);
    const canvas = surface.getCanvas();

    // Fill border
    canvas.clear(borderColor);

    // Fill background
    canvas.drawRect4f(clientStartX, clientStartY, clientEndX, clientEndY, paint);

    // Draw content
    canvas.drawParagraph(content, contentStartX, contentStartY);

    // Get image data bytes
    const image = surface.makeImageSnapshot();
    const data = image.encodeToBytes();
    const width = image.width();
    const height = image.height();

    // Free up memory
    surface.delete();
    image.delete();
    content.delete();
    builder.delete();

    // Return bytes
    return { data, width, height };
  }

  free() {
    // Free up memory
    this.mgr.delete();
    this.paint.delete();
  }
}
