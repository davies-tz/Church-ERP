"""Certificate PDF generation."""
import datetime

from app.domain.certificates import render_certificate


def test_render_returns_pdf_bytes():
    pdf = render_certificate(
        sacrament_type="baptism",
        date=datetime.date(2020, 3, 15),
        church_name="Grace Community Church",
        member_name="Emanuel Thomas",
        place_name="Grace Community Church",
        minister_name="Rev. John Paul",
        register_book="B-1",
        register_page="12",
        color_hex="#6d28d9",
    )
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 800


def test_marriage_certificate_with_spouse():
    pdf = render_certificate(
        sacrament_type="marriage",
        date=datetime.date(2024, 9, 20),
        church_name="St. Mark's Parish",
        member_name="Emanuel Thomas",
        spouse_name="Sarah John",
        color_hex="#047857",
    )
    assert pdf[:4] == b"%PDF"


def test_bad_colour_falls_back():
    pdf = render_certificate(
        sacrament_type="confirmation",
        date=datetime.date(2022, 6, 12),
        church_name="Church",
        member_name="Someone",
        color_hex="not-a-colour",
    )
    assert pdf[:4] == b"%PDF"
