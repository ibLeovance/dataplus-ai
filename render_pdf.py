import weasyprint

weasyprint.HTML(filename="/home/ubuntu/dataplus-ai/description.html").write_pdf(
    "/home/ubuntu/dataplus-ai/BAIANIN_AI_COMPUTER_PLUS.pdf"
)
print("PDF written OK")
