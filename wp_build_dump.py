import openpyxl

path = r"C:/Users/liush/Desktop/Ai/wordpress/HOLANG网站资料总表-260720.xlsx"
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

sheets = ["公司与联系", "产品参数", "认证与证据", "应用边界", "案例项目"]
for name in sheets:
    ws = wb[name]
    print(f"\n########## {name} ##########")
    for ri, row in enumerate(ws.iter_rows(values_only=True), 1):
        cells = [str(c).strip() for c in row if c is not None and str(c).strip() != ""]
        if not cells:
            continue
        line = " | ".join(str(c)[:55] for c in row if c is not None)
        print(f"[{ri}] {line}")
wb.close()
