import weasyprint

html_string = """
<!DOCTYPE html>
<html>
<body>
<div class="script-image align-center"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" style="width:400px;max-width:100%;height:auto;" /></div>
</body>
</html>
"""

html = weasyprint.HTML(string=html_string)
pdf_bytes = html.write_pdf("test.pdf")
print("PDF created")
