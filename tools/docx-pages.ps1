# Counts the page of every heading (outline levels 1 and 2) of a DOCX with Microsoft Word and writes them to a JSON array,
# in the order of the contents lines. Used by tools/docx-cli.js; Word must be installed.
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [Parameter(Mandatory = $true)][string]$Out
)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open((Resolve-Path $Docx).Path, $false, $true)
  $doc.Repaginate()
  $pages = @()
  foreach ($paragraph in $doc.Paragraphs) {
    if ($paragraph.OutlineLevel -eq 1 -or $paragraph.OutlineLevel -eq 2) {
      $pages += [int]$paragraph.Range.Information(3)
    }
  }
  $doc.Close($false)
  ConvertTo-Json -InputObject @($pages) -Compress | Set-Content -Encoding ascii -Path $Out
}
finally {
  $word.Quit()
}
