from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[1]
out = root / 'cv'
out.mkdir(exist_ok=True)
pdf = out / 'Polina-Kolesnikova-CV-template.pdf'
c = canvas.Canvas(str(pdf), pagesize=A4)
c.setTitle('Polina Kolesnikova — CV working template')
c.setAuthor('Polina Kolesnikova')
w,h = A4
left, right, y = 43, w-43, h-42
ink, muted, accent = HexColor('#15243b'), HexColor('#536075'), HexColor('#6552a6')

def text(s, size=10, bold=False, color=None, gap=15):
    global y
    c.setFillColor(color or ink)
    c.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    c.drawString(left, y, s)
    y -= gap

def wrap(s, size=9.5, indent=0, color=None):
    global y
    words=s.split(); lines=[]; line=''
    for word in words:
        attempt=(line+' '+word).strip()
        if pdfmetrics.stringWidth(attempt,'Helvetica',size) > right-left-indent:
            lines.append(line); line=word
        else: line=attempt
    if line: lines.append(line)
    c.setFillColor(color or ink); c.setFont('Helvetica',size)
    for line in lines:
        c.drawString(left+indent,y,line); y-=13

def section(s):
    global y
    y-=13
    text(s.upper(),9.5,True,accent,17)

text('POLINA KOLESNIKOVA',25,True,gap=27)
text('Business Analyst / Product Owner | Healthcare & AI',11,color=muted,gap=20)
text('GitHub: github.com/KPSKolesnikova',9.5,color=muted,gap=14)
text('[Email]  |  [LinkedIn URL]  |  [Location / work authorization]',9,color=accent,gap=22)
c.setStrokeColor(HexColor('#c7c0de')); c.line(left,y,right,y); y-=20
text('WORKING TEMPLATE - complete bracketed fields before applying.',9,True,accent,gap=16)

section('Profile')
wrap('Business Analyst / Product Owner in healthcare, working on AI adoption in medical information systems, requirements gathering, solution testing and quality evaluation. Final-year Business Informatics student with a background in Python, SQL and statistics.')

section('Experience')
text('Business Analyst / Product Owner',11,True,gap=16)
text('MMC Group (My Medical Center) | [Month Year - Present]',9.5,color=muted,gap=17)
for s in ['Gather requirements for AI-enabled solutions in medical information systems.', 'Test solutions and evaluate their quality against business needs.', '[Add a specific project, your personal contribution and a verifiable result.]']:
    wrap('- '+s,color=accent if s.startswith('[') else None)

section('Selected project')
text('Clinical Compass | Demonstration prototype',11,True,gap=16)
wrap('Clinician and patient workflows with explainable support for reviewing patient-reported information. Includes a product presentation and algorithm documentation. Uses fictional records; clinical effectiveness has not been externally validated.')
wrap('[Describe your personal role, key decisions and demonstrated outcomes.]',color=accent)
text('github.com/KPSKolesnikova/clinical-compass',9,color=muted,gap=14)

section('Education')
text('Plekhanov Russian University of Economics',11,True,gap=16)
text('Business Informatics | Final year | Expected graduation: [Year]',9.5,color=muted,gap=15)

section('Skills')
wrap('Business analysis: requirements gathering, solution testing, AI quality evaluation.')
wrap('Data & technology: Python, SQL, statistics, JavaScript, TypeScript, C++.')
wrap('Languages: Russian - C1; English - C1; German - A2. Machine Learning: currently learning.')

section('Credentials - complete later')
wrap('[Add only earned credentials: exact name, issuer, date and verification link.]',color=accent)
if y < 45: raise RuntimeError(f'CV exceeds one-page layout: {y}')
c.setFillColor(muted); c.setFont('Helvetica',8)
c.drawRightString(right,24,'Editable working template | 28 October 2026')
c.save()
doc=pdfium.PdfDocument(str(pdf))
if len(doc)!=1: raise RuntimeError('Expected one page')
doc[0].render(scale=1.5).to_pil().save(out / 'cv-template-preview.png')
print(str(pdf))