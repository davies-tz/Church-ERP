"""Render a sacramental certificate as a branded PDF (reportlab)."""
import datetime
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.domain.sacraments import SACRAMENT_TYPES


def _brand(hexstr: str | None):
    try:
        return colors.HexColor(hexstr or "#6d28d9")
    except Exception:  # noqa: BLE001 - fall back to a safe default colour
        return colors.HexColor("#6d28d9")


def render_certificate(
    *,
    sacrament_type: str,
    date: datetime.date,
    church_name: str,
    member_name: str,
    place_name: str | None = None,
    minister_name: str | None = None,
    register_book: str | None = None,
    register_page: str | None = None,
    spouse_name: str | None = None,
    color_hex: str | None = "#6d28d9",
) -> bytes:
    label = SACRAMENT_TYPES.get(sacrament_type, (sacrament_type.title(), ""))[0]
    brand = _brand(color_hex)
    buf = io.BytesIO()
    W, H = A4
    c = canvas.Canvas(buf, pagesize=A4)

    # decorative double border
    c.setStrokeColor(brand)
    c.setLineWidth(4)
    c.rect(14 * mm, 14 * mm, W - 28 * mm, H - 28 * mm)
    c.setLineWidth(1)
    c.rect(18 * mm, 18 * mm, W - 36 * mm, H - 36 * mm)

    cx = W / 2
    y = H - 40 * mm

    # small cross drawn with lines (avoids font-glyph issues)
    c.setStrokeColor(brand)
    c.setLineWidth(3)
    c.line(cx, y + 5 * mm, cx, y - 5 * mm)
    c.line(cx - 4 * mm, y + 2 * mm, cx + 4 * mm, y + 2 * mm)
    y -= 16 * mm

    c.setFillColor(brand)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(cx, y, church_name)
    y -= 18 * mm

    c.setFillColor(colors.black)
    c.setFont("Times-Bold", 30)
    c.drawCentredString(cx, y, f"Certificate of {label}")
    y -= 7 * mm
    c.setStrokeColor(brand)
    c.setLineWidth(1.5)
    c.line(cx - 45 * mm, y, cx + 45 * mm, y)
    y -= 22 * mm

    c.setFont("Times-Roman", 14)
    c.drawCentredString(cx, y, "This is to certify that")
    y -= 15 * mm

    c.setFillColor(brand)
    c.setFont("Times-Bold", 24)
    c.drawCentredString(cx, y, member_name)
    y -= 14 * mm

    c.setFillColor(colors.black)
    c.setFont("Times-Roman", 14)
    if spouse_name:
        c.drawCentredString(cx, y, f"and {spouse_name}")
        y -= 12 * mm
    c.drawCentredString(cx, y, f"received the Sacrament of {label}")
    y -= 11 * mm

    when = date.strftime("%d %B %Y")
    line = f"on {when}" + (f" at {place_name}" if place_name else "")
    c.drawCentredString(cx, y, line)
    y -= 18 * mm

    if minister_name:
        c.setFont("Times-Italic", 12)
        c.drawCentredString(cx, y, f"Officiated by {minister_name}")

    # footer: register reference + signature line
    by = 40 * mm
    c.setFillColor(colors.grey)
    c.setFont("Helvetica", 10)
    c.drawString(24 * mm, by, f"Register: {register_book or '-'} / {register_page or '-'}")

    c.setStrokeColor(colors.black)
    c.setLineWidth(0.8)
    c.line(W - 82 * mm, by + 5 * mm, W - 24 * mm, by + 5 * mm)
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 9)
    c.drawCentredString(W - 53 * mm, by, "Minister / Officiant")

    c.showPage()
    c.save()
    return buf.getvalue()


def render_transfer_letter(
    *,
    member_name: str,
    member_no: str,
    from_church: str,
    to_church: str,
    date: datetime.date,
    issued_by: str | None = None,
    reason: str | None = None,
    color_hex: str | None = "#6d28d9",
) -> bytes:
    """A transfer-out letter: the source church releasing a member to a new church."""
    brand = _brand(color_hex)
    buf = io.BytesIO()
    W, H = A4
    c = canvas.Canvas(buf, pagesize=A4)

    c.setStrokeColor(brand)
    c.setLineWidth(3)
    c.rect(16 * mm, 16 * mm, W - 32 * mm, H - 32 * mm)

    cx = W / 2
    y = H - 35 * mm
    c.setFillColor(brand)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(cx, y, from_church)
    y -= 12 * mm

    c.setFillColor(colors.black)
    c.setFont("Times-Bold", 22)
    c.drawCentredString(cx, y, "Transfer-Out Letter")
    y -= 6 * mm
    c.setStrokeColor(brand)
    c.setLineWidth(1.5)
    c.line(cx - 40 * mm, y, cx + 40 * mm, y)
    y -= 16 * mm

    left = 26 * mm
    when = date.strftime("%d %B %Y")
    c.setFillColor(colors.black)
    c.setFont("Times-Roman", 12)
    c.drawString(left, y, f"Date: {when}")
    y -= 12 * mm

    body_lines = [
        f"To whom it may concern at {to_church},",
        "",
        f"This letter confirms that {member_name} (Member No. {member_no}) is a",
        f"member in good standing of {from_church} and is being released to",
        f"transfer their membership to {to_church}.",
    ]
    if reason:
        body_lines += ["", f"Reason for transfer: {reason}"]
    body_lines += ["", "We commend them to your fellowship and care."]

    for line in body_lines:
        c.drawString(left, y, line)
        y -= 7 * mm

    y -= 15 * mm
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.8)
    c.line(left, y, left + 65 * mm, y)
    y -= 5 * mm
    c.setFont("Helvetica", 9)
    c.drawString(left, y, issued_by or "Church Leader")
    y -= 5 * mm
    c.drawString(left, y, "Issuing Leader")

    c.showPage()
    c.save()
    return buf.getvalue()
