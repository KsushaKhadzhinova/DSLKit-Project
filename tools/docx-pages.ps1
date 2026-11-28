# Counts the page of every heading (outline levels 1 and 2) of a DOCX with Microsoft Word and writes them to a JSON file together
# with the titles of the headings and the fill of every page in percent (the end of the last line against the text area), in the order
# of the contents lines. Used by tools/docx-cli.js; Word must be installed.
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
  $titles = @()
  foreach ($paragraph in $doc.Paragraphs) {
    if ($paragraph.OutlineLevel -eq 1 -or $paragraph.OutlineLevel -eq 2) {
      $pages += [int]$paragraph.Range.Information(3)
      $titles += $paragraph.Range.Text.Trim()
    }
  }
  # Fill of a page: the vertical position of the last character against the height of the text area (A4, margins 20 mm).
  $count = $doc.ComputeStatistics(2)
  $fill = @()
  for ($i = 1; $i -le $count; $i++) {
    $end = if ($i -lt $count) { $doc.GoTo(1, 1, $i + 1).Start - 1 } else { $doc.Content.End - 1 }
    $y = $doc.Range($end, $end).Information(6)
    $fill += [int][Math]::Min(100, [Math]::Round(($y + 16 - 56.7) / (841.9 - 113.4) * 100))
  }
  $doc.Close($false)
  $result = [ordered]@{ pages = @($pages); titles = @($titles); fill = @($fill) }
  ConvertTo-Json -InputObject $result -Compress | Set-Content -Encoding utf8 -Path $Out
}
finally {
  $word.Quit()
}
