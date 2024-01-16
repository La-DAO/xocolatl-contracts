## Markdown to PDF

Use [pandoc](https://pandoc.org/) and [wkhtmltopdf](https://wkhtmltopdf.org/) to convert `.md` file to `.pdf`.

From the `whitepaper/` folder run:

```shell
pandoc xocolatl_whitepaper.md -f markdown -t pdf --pdf-engine=wkhtmltopdf -c style.css -s -o xocolatl_whitepaper.pdf
```

```shell
pandoc translations/spanish/xocolatl_whitepaper_es.md -f markdown -t pdf --pdf-engine=wkhtmltopdf -c style.css -s -o translations/spanish/xocolatl_whitepaper_es.pdf
```
