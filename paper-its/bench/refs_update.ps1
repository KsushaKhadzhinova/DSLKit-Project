$ErrorActionPreference = 'Stop'
$b = 'E:\DSLKit-Project\paper-its\articles'
$utf8 = New-Object Text.UTF8Encoding($false)
$NO = [string][char]0x2116

function Rep([ref]$t, [string]$old, [string]$new, [string]$tag) {
  if (-not $t.Value.Contains($old)) { Write-Output "MISSING [$tag]: $($old.Substring(0, [Math]::Min(50, $old.Length)))"; return }
  $t.Value = $t.Value.Replace($old, $new)
}
function Reorder([ref]$t, [string[]]$keys, [string[]]$extra) {
  $m = [regex]::Match($t.Value, '(?s)\\ListReferences\{\r?\n(.*?)\r?\n\}')
  $items = $m.Groups[1].Value -split "\r?\n" | Where-Object { $_.StartsWith('\item') }
  $out = @()
  foreach ($k in $keys) {
    if ($k.StartsWith('NEW:')) { $out += $extra[[int]$k.Substring(4)]; continue }
    $hit = $items | Where-Object { $_.Contains($k) } | Select-Object -First 1
    if (-not $hit) { Write-Output "REF NOT FOUND: $k" } else { $out += $hit }
  }
  $block = "\ListReferences{`n" + ($out -join "`n") + "`n}"
  $t.Value = $t.Value.Substring(0, $m.Index) + $block + $t.Value.Substring($m.Index + $m.Length)
}
function Save($f, $t) { [IO.File]::WriteAllText($f, $t, $utf8) }

$her = '\item Herman,~I. Graph visualization and navigation in information visualization: a survey~/ I.~Herman, G.~Melancon, M.~S.~Marshall~// IEEE Trans. Vis. Comput. Graph.~-- 2000.~-- Vol.~6, NUM~1.~-- P.~24--43.'
$dre = '\item Drepper,~U. What every programmer should know about memory.~-- Red Hat, 2007.~-- 114~p.'
$d3  = '\item Bostock,~M. D3: data-driven documents~/ M.~Bostock, V.~Ogievetsky, J.~Heer~// IEEE Trans. Vis. Comput. Graph.~-- 2011.~-- Vol.~17, NUM~12.~-- P.~2301--2309.'
$fin = '\item Finkel,~R.~A. Quad trees: a data structure for retrieval on composite keys~/ R.~A.~Finkel, J.~L.~Bentley~// Acta Inform.~-- 1974.~-- Vol.~4, NUM~1.~-- P.~1--9.'
function Num($s, $ru) { if ($ru) { return $s.Replace('NUM', $NO) } else { return $s.Replace('NUM', 'No.') } }

# ===== статья 1, русская версия =====
$f = "$b\a1-representation\khadzhynava-repr-ru.tex"; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
Rep ([ref]$t) 'Для хранения графов применяют объекты со ссылками, списки смежности и компактные массивы [2]. Объектная модель удобна для редактирования, но каждый узел и ребро несут накладные расходы объекта. Для больших графов важны также компактность и скорость обработки данных [1, 3].' 'Для больших графов важны компактность хранения и скорость обработки данных [1, 2]; обзор методов работы с графами в информационной визуализации приведен в [3]. Для хранения графов применяют объекты со ссылками, списки смежности и компактные массивы [4]. Объектная модель удобна для редактирования, но каждый узел и ребро несут накладные расходы объекта.' 'a1ru-p2'
Rep ([ref]$t) 'единым графовым представлением [4];' 'единым графовым представлением [5];' 'a1ru-own'
Rep ([ref]$t) 'состоит в расположении данных в памяти и требует' 'состоит в расположении данных в памяти [6] и требует' 'a1ru-drepper'
Reorder ([ref]$t) @('Козарь', 'Abello', 'NEW:0', 'Introduction to Algorithms', 'Ломако', 'NEW:1') @((Num $her $true), (Num $dre $true))
Save $f $t; 'a1-ru ok'

# ===== статья 1, английская версия =====
$f = "$b\a1-representation\khadzhynava-repr-en.tex"; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
Rep ([ref]$t) 'Graphs are stored as linked objects, adjacency lists and compact arrays [2]. The object model is convenient for editing, but every node and edge carries object overhead. For large graphs, compactness and processing speed of data also matter [1, 3].' 'For large graphs, compactness of storage and speed of data processing matter [1, 2]; a survey of graph handling in information visualization is given in [3]. Graphs are stored as linked objects, adjacency lists and compact arrays [4]. The object model is convenient for editing, but every node and edge carries object overhead.' 'a1en-p2'
Rep ([ref]$t) 'with a unified graph representation [4];' 'with a unified graph representation [5];' 'a1en-own'
Rep ([ref]$t) 'is probably the layout of data in memory and requires' 'is probably the layout of data in memory [6] and requires' 'a1en-drepper'
Reorder ([ref]$t) @('Kozar', 'Abello', 'NEW:0', 'Introduction to Algorithms', 'Lomako', 'NEW:1') @((Num $her $false), (Num $dre $false))
Save $f $t; 'a1-en ok'

# ===== статья 2, русская версия =====
$f = "$b\a2-spatial\khadzhynava-spatial-ru.tex"; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
Rep ([ref]$t) 'Стандартным способом вывода в веб-приложениях является SVG: каждый элемент становится узлом DOM, что делает массовую отрисовку дорогой. Для больших графов применяют кластеризацию данных [1], уровни детализации, при которых плотные области графа агрегируются [2], и отображение только текущей области просмотра: так, в GraphMaps на каждом масштабе рисуются лишь элементы внутри видимой области [3], а в ASK-GraphView используется иерархическая кластеризация [4].' 'Для больших графов применяют кластеризацию данных [1], уровни детализации, при которых плотные области графа агрегируются [2], и отображение только текущей области просмотра: так, в GraphMaps на каждом масштабе рисуются лишь элементы внутри видимой области [3], а в ASK-GraphView используется иерархическая кластеризация [4]; обзор методов визуализации графов дан в [5]. Стандартным способом вывода в веб-приложениях является SVG, например в библиотеке D3 [6]: каждый элемент становится узлом DOM, что делает массовую отрисовку дорогой.' 'a2ru-p2'
Rep ([ref]$t) 'единым графовым представлением [5];' 'единым графовым представлением [7];' 'a2ru-own'
Rep ([ref]$t) 'Quadtree рекурсивно делит область' 'Quadtree [8] рекурсивно делит область' 'a2ru-quad'
Reorder ([ref]$t) @('Козарь', 'Zinsmaier', 'GraphMaps', 'Abello', 'NEW:0', 'NEW:1', 'Ломако', 'NEW:2') @((Num $her $true), (Num $d3 $true), (Num $fin $true))
Save $f $t; 'a2-ru ok'

# ===== статья 2, английская версия =====
$f = "$b\a2-spatial\khadzhynava-spatial-en.tex"; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
Rep ([ref]$t) 'SVG is the standard output format in web applications: every element becomes a DOM node, which makes mass rendering expensive. For large graphs, data clustering [1], level-of-detail methods that aggregate dense regions [2] and rendering of the current viewport only are used: GraphMaps draws only the elements inside the visible area at every scale [3], and ASK-GraphView relies on hierarchical clustering [4].' 'For large graphs, data clustering [1], level-of-detail methods that aggregate dense regions [2] and rendering of the current viewport only are used: GraphMaps draws only the elements inside the visible area at every scale [3], and ASK-GraphView relies on hierarchical clustering [4]; a survey of graph visualization methods is given in [5]. SVG is the standard output format in web applications, for example in the D3 library [6]: every element becomes a DOM node, which makes mass rendering expensive.' 'a2en-p2'
Rep ([ref]$t) 'unified graph representation [5];' 'unified graph representation [7];' 'a2en-own'
Rep ([ref]$t) 'A quadtree recursively divides' 'A quadtree [8] recursively divides' 'a2en-quad'
Reorder ([ref]$t) @('Kozar', 'Zinsmaier', 'GraphMaps', 'Abello', 'NEW:0', 'NEW:1', 'Lomako', 'NEW:2') @((Num $her $false), (Num $d3 $false), (Num $fin $false))
Save $f $t; 'a2-en ok'
