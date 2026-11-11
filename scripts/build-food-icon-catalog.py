"""Package generated icons, author the review PDF and prepare database payloads."""
import base64, hashlib, json, shutil, sys
from pathlib import Path
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'food-icons'
ASSETS = ROOT / 'assets' / 'icons' / 'food-flat-v1'
PDF = ROOT / 'output' / 'pdf' / 'biblioteca-icones-alimentares.pdf'
ORG = '5ea1bb39-950d-41cf-a7e8-a002df4f6168'

def package_icons(items):
    ASSETS.mkdir(parents=True, exist_ok=True)
    (OUT / 'masters').mkdir(parents=True, exist_ok=True)
    result = []
    for item in items:
        if item['status'] != 'generated':
            raise ValueError('Missing generated icon: ' + item['id'])
        source = Path(item['source'])
        if not source.is_absolute():
            source = ROOT / source
        master = OUT / 'masters' / (item['id'] + '.png')
        if source.resolve() != master.resolve():
            shutil.copy2(source, master)
        with Image.open(source) as img:
            image = ImageOps.contain(img.convert('RGB'), (512, 512), Image.Resampling.LANCZOS)
            tile = Image.new('RGB', (512, 512), 'white')
            tile.paste(image, ((512-image.width)//2, (512-image.height)//2))
            target = ASSETS / (item['id'] + '.webp')
            tile.save(target, 'WEBP', quality=94, method=6)
        data = target.read_bytes()
        entry = {k:item[k] for k in ['id','label','group','unicode','subject']}
        entry.update(path=str(target.relative_to(ROOT)).replace('\\','/'), sha256=hashlib.sha256(data).hexdigest(), width=512, height=512, bytes=len(data), mime_type='image/webp', style_version='flat-warm-v1', assigned=False)
        result.append(entry)
    metadata = dict(version='flat-warm-v1', generated_at='2026-11-05', organization_id=ORG, assignment='none', count=len(result), source_url='https://unicode.org/emoji/charts/emoji-list.html', generator='built-in image_gen', reference='Grade de categorias alimentares em português.png', icons=result)
    (ASSETS / 'manifest.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / 'catalog.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    return result

def write_pdf(items):
    font_dir=Path('C:/Windows/Fonts')
    pdfmetrics.registerFont(TTFont('UI',str(font_dir/'arial.ttf')))
    pdfmetrics.registerFont(TTFont('UIBold',str(font_dir/'arialbd.ttf')))
    pdf=canvas.Canvas(str(PDF), pagesize=(595.276,841.89))
    pdf.setTitle('Biblioteca de ícones alimentares - flat design')
    pdf.setAuthor('NK Control')
    groups=list(dict.fromkeys(x['group'] for x in items))
    for page,group in enumerate(groups,1):
        pdf.setFillColor(HexColor('#FBF8F3')); pdf.rect(0,0,595.276,841.89,fill=1,stroke=0)
        pdf.setFillColor(HexColor('#A75B25')); pdf.setFont('UIBold',9)
        pdf.drawString(34,806,'NK CONTROL  /  BIBLIOTECA VISUAL')
        pdf.setFillColor(HexColor('#34261E')); pdf.setFont('UIBold',23)
        pdf.drawString(34,773,group)
        pdf.setFillColor(HexColor('#7E7064')); pdf.setFont('UI',9)
        entries=[x for x in items if x['group']==group]
        pdf.drawString(34,753,f'{len(entries)} ícones  |  Flat design  |  Disponíveis para atribuição futura')
        cw=131.8; ch=133
        for index,item in enumerate(entries):
            col=index%4; row=index//4; x=34+col*cw; y=730-row*ch
            pdf.setFillColor(HexColor('#FFFFFF')); pdf.setStrokeColor(HexColor('#EBE2D7'))
            pdf.roundRect(x,y-108,cw-10,108,14,fill=1,stroke=1)
            pdf.drawImage(ImageReader(str(ROOT/item['path'])),x+12,y-101,width=cw-34,height=96,preserveAspectRatio=True,anchor='c')
            label=item['label']
            font_size=8.5 if len(label)>23 else 9.3
            pdf.setFillColor(HexColor('#34261E')); pdf.setFont('UIBold',font_size)
            pdf.drawCentredString(x+(cw-10)/2,y-121,label)
            pdf.setFillColor(HexColor('#A08D7D')); pdf.setFont('UI',6.3)
            pdf.drawCentredString(x+(cw-10)/2,y-131,item['id'])
        pdf.setStrokeColor(HexColor('#DED1C3')); pdf.line(34,45,561,45)
        pdf.setFont('UI',7.4);pdf.setFillColor(HexColor('#7E7064'))
        pdf.drawString(34,30,'78 ícones • 05/11/2026 • v1 • Sem atribuição automática')
        pdf.drawRightString(561,30,f'{page} / {len(groups)}')
        pdf.showPage()
    pdf.save()

def render_pdf():
    document=pdfium.PdfDocument(str(PDF))
    thumbs=[]
    for i,page in enumerate(document):
        img=page.render(scale=1.5).to_pil()
        img.save(OUT/f'pagina-{i+1}.png')
        thumbs.append(ImageOps.contain(img.convert('RGB'),(397,562)))
    overview=Image.new('RGB',(397*len(thumbs),562),'#FBF8F3')
    for i,img in enumerate(thumbs):overview.paste(img,(397*i,0))
    overview.save(OUT/'previa-catalogo.png')
    print(json.dumps({'pages':len(document),'icons':len(json.loads((OUT/'catalog.json').read_text(encoding='utf8'))['icons'])}))

def payload(start,end):
    meta=json.loads((OUT/'catalog.json').read_text(encoding='utf8'))
    rows=[]
    for item in meta['icons'][start:end]:
        rows.append(dict(organization_id=ORG,slug=item['id'],label=item['label'],collection=item['group'],unicode_codepoints=item['unicode'] or None,width=512,height=512,sha256=item['sha256'],image_base64=base64.b64encode((ROOT/item['path']).read_bytes()).decode('ascii')))
    print(json.dumps(rows,ensure_ascii=False))

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='payload':payload(int(sys.argv[2]),int(sys.argv[3]))
    else:
        OUT.mkdir(parents=True,exist_ok=True); PDF.parent.mkdir(parents=True,exist_ok=True)
        items=json.loads((OUT/'generation-manifest.json').read_text(encoding='utf8'))
        icons=package_icons(items);write_pdf(icons);render_pdf()
