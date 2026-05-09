import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, HeadingLevel } from "docx";

// Layout in inches
const LAYOUT = {
  "scene-heading": { left: 1.5, right: 1.0 },
  action: { left: 1.5, right: 1.0 },
  character: { left: 3.7, right: 1.0 },
  parenthetical: { left: 3.0, right: 2.5 },
  dialogue: { left: 2.5, right: 1.5 },
  transition: { left: 1.5, right: 1.0, align: AlignmentType.RIGHT },
  shot: { left: 1.5, right: 1.0 },
};

export async function exportToDocx(html: string, title: string, meta: any) {
  const parser = new DOMParser();
  const docHtml = parser.parseFromString(`<div>${html}</div>`, "text/html");

  const children: any[] = [];

  // Title Page
  if (title || meta.author) {
    children.push(
      new Paragraph({
        text: (title || "UNTITLED SCRIPT").toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 5000, after: 400 },
      })
    );
    if (meta.writtenByPrefix || meta.author) {
      children.push(
        new Paragraph({
          text: meta.writtenByPrefix || "written by",
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: meta.author || "",
          alignment: AlignmentType.CENTER,
          spacing: { after: 2000 },
        })
      );
    }
    
    if (meta.logline) {
      children.push(
        new Paragraph({
          text: "LOGLINE",
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000, after: 200 },
        }),
        new Paragraph({
          text: meta.logline,
          alignment: AlignmentType.CENTER,
        })
      );
    }
    
    if (meta.synopsis) {
      children.push(
        new Paragraph({
          text: "SYNOPSIS",
          alignment: AlignmentType.CENTER,
          spacing: { before: 1000, after: 200 },
        }),
        new Paragraph({
          text: meta.synopsis,
          alignment: AlignmentType.CENTER,
        })
      );
    }

    if (meta.contact) {
      const contactLines = meta.contact.split("\n");
      children.push(
        new Paragraph({
          text: contactLines[0],
          spacing: { before: 5000 },
        })
      );
      for (let i = 1; i < contactLines.length; i++) {
        children.push(new Paragraph({ text: contactLines[i] }));
      }
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Parse nodes
  const KNOWN = new Set(Object.keys(LAYOUT));

  docHtml.querySelectorAll("p").forEach((p) => {
    const type = p.className.split(/\s+/).find((c) => KNOWN.has(c)) ?? "action";
    const plainText = p.textContent?.trim() ?? "";
    if (!plainText) return;

    const layout = LAYOUT[type as keyof typeof LAYOUT] ?? LAYOUT["action"];
    const isUpper = ["scene-heading", "character", "transition", "shot"].includes(type);

    const runs: TextRun[] = [];
    const extractRuns = (node: Node, bold: boolean, italic: boolean, underline: boolean) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = isUpper ? (node.textContent || "").toUpperCase() : (node.textContent || "");
        if (text) {
          runs.push(new TextRun({ text, bold, italics: italic, underline: underline ? {} : undefined, font: "Courier New", size: 24 }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName.toLowerCase();
        const b = bold || tag === "strong" || tag === "b";
        const i = italic || tag === "em" || tag === "i";
        const u = underline || tag === "u";
        for (const child of Array.from(node.childNodes)) {
          extractRuns(child, b, i, u);
        }
      }
    };
    
    extractRuns(p, false, false, false);
    
    // Convert inches to twips (1 inch = 1440 twips)
    children.push(
      new Paragraph({
        children: runs,
        alignment: layout.align || AlignmentType.LEFT,
        indent: {
          left: layout.left * 1440,
          right: layout.right * 1440,
        },
        spacing: {
          before: ["scene-heading"].includes(type) ? 240 : 120, // Add space before some elements
        }
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = (title || "script").replace(/[^a-zA-Z0-9 ]/g, "").trim() || "script";
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeTitle}.docx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}
