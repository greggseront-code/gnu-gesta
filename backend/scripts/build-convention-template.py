"""Build the immutable application convention template from the supplied annex."""

from __future__ import annotations

import copy
import sys
import zipfile
from pathlib import Path

from lxml import etree

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
W = f"{{{W_NS}}}"

FIELD_PLACEHOLDERS = {
    "PrénomEtud": "{{student_first_name}}",
    "NomEtud": "{{student_last_name}}",
    "NomSoc": "{{company_name}}",
    "PrénomResp": "{{contact_first_name}}",
    "NomResp": "{{contact_last_name}}",
    "TitreResp": "",
    "Feminin": "",
}


def paragraph_text(paragraph: etree._Element) -> str:
    return "".join(paragraph.xpath(".//w:t/text()", namespaces=NS))


def replace_paragraph(paragraph: etree._Element, chunks: list[tuple[str, etree._Element | None, bool]]) -> None:
    ppr = paragraph.find(f"{W}pPr")
    for child in list(paragraph):
        if child is not ppr:
            paragraph.remove(child)
    for text, source_run, add_break in chunks:
        run = etree.Element(f"{W}r")
        if source_run is not None:
            rpr = source_run.find(f"{W}rPr")
            if rpr is not None:
                run.append(copy.deepcopy(rpr))
        if add_break:
            run.append(etree.Element(f"{W}br"))
        text_node = etree.SubElement(run, f"{W}t")
        if text.startswith(" ") or text.endswith(" "):
            text_node.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        text_node.text = text
        paragraph.append(run)


def first_run_with_text(paragraph: etree._Element, needle: str) -> etree._Element | None:
    for run in paragraph.findall(f"{W}r"):
        if needle in "".join(run.xpath(".//w:t/text()", namespaces=NS)):
            return run
    return paragraph.find(f"{W}r")


def collapse_merge_fields(paragraph: etree._Element) -> None:
    while True:
        children = list(paragraph)
        start = None
        depth = 0
        for index, child in enumerate(children):
            if child.tag != f"{W}r":
                continue
            field_chars = child.findall(f"{W}fldChar")
            for field_char in field_chars:
                kind = field_char.get(f"{W}fldCharType")
                if kind == "begin":
                    if depth == 0:
                        start = index
                    depth += 1
                elif kind == "end" and depth:
                    depth -= 1
                    if depth == 0 and start is not None:
                        segment = children[start : index + 1]
                        instruction = "".join(
                            node.text or ""
                            for element in segment
                            for node in element.findall(f".//{W}instrText")
                        )
                        field_name = next((name for name in FIELD_PLACEHOLDERS if name in instruction), None)
                        if field_name is None:
                            start = None
                            continue
                        source_run = next(
                            (element for element in segment if element.findall(f".//{W}t")),
                            segment[0],
                        )
                        new_run = etree.Element(f"{W}r")
                        rpr = source_run.find(f"{W}rPr")
                        if rpr is not None:
                            new_run.append(copy.deepcopy(rpr))
                        text_node = etree.SubElement(new_run, f"{W}t")
                        text_node.text = FIELD_PLACEHOLDERS[field_name]
                        paragraph.insert(start, new_run)
                        for element in segment:
                            paragraph.remove(element)
                        break
            else:
                continue
            break
        else:
            return


def patch_document(xml_bytes: bytes) -> bytes:
    root = etree.fromstring(xml_bytes)
    for paragraph in root.xpath(".//w:p", namespaces=NS):
        text = paragraph_text(paragraph)
        if "Sauter l'enregistrement" in text:
            source = first_run_with_text(paragraph, "Entre les soussignés")
            replace_paragraph(paragraph, [("Entre les soussignés :", source, False)])
            continue
        if "PrénomEtud" in text and "année terminale" in text:
            source = first_run_with_text(paragraph, "PrénomEtud")
            replace_paragraph(paragraph, [(
                "{{student_first_name}} {{student_last_name}}, en année terminale du Baccalauréat en Informatique, "
                "ci-après « l'Étudiant »,",
                source,
                False,
            )])
            continue
        if "NomSoc" in text and "représentée" in text:
            source = first_run_with_text(paragraph, "NomSoc")
            replace_paragraph(paragraph, [(
                "la société {{company_name}}, établie à {{company_address}}, représentée par "
                "{{contact_first_name}} {{contact_last_name}}, ci-après nommée « l'Entreprise ».",
                source,
                False,
            )])
            continue
        if "Art. 2" in text and "Le stage débute" in text:
            heading = first_run_with_text(paragraph, "Art. 2")
            body = first_run_with_text(paragraph, "Le stage débute")
            replace_paragraph(paragraph, [
                ("Art. 2", heading, False),
                ("    Le stage débute le {{start_date}} et prend fin le {{end_date}} "
                 "(moyennant accord des différentes parties, cette période pourrait être prolongée).", body, False),
                ("Les prestations s'effectuent 5 jours par semaine aux heures prévues par l'Entreprise. "
                 "Le calendrier des congés scolaires n'est pas d'application. L'Étudiant doit effectuer "
                 "ses prestations dans les locaux de l'Entreprise.", body, True),
            ])
            continue
        if "Fait en trois exemplaires" in text:
            source = first_run_with_text(paragraph, "Fait en trois exemplaires")
            replace_paragraph(paragraph, [(
                "Fait en trois exemplaires, à Bruxelles, le {{generation_date}}",
                source,
                False,
            )])
            continue
        collapse_merge_fields(paragraph)

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone="yes")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: build-convention-template.py SOURCE.docx OUTPUT.docx")
    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    if source == output:
        raise SystemExit("source and output must differ")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source, "r") as input_zip, zipfile.ZipFile(output, "w") as output_zip:
        for item in input_zip.infolist():
            data = input_zip.read(item.filename)
            if item.filename == "word/document.xml":
                data = patch_document(data)
            output_zip.writestr(item, data)


if __name__ == "__main__":
    main()
