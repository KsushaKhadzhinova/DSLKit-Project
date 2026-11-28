# Captures a real window (title bar, address bar and content) into a PNG from the screen after the window is brought to the front.
# Usage: powershell -NoProfile -File window-shot.ps1 -Out file.png -TitleLike "*part of the title*"
# Nothing is drawn: the pixels are the ones the real window paints.
param([Parameter(Mandatory)][string]$Out, [Parameter(Mandatory)][string]$TitleLike, [int]$MaxWidth = 0)
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Collections.Generic; using System.Runtime.InteropServices; using System.Text;
public static class W {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static List<IntPtr> All() { var l = new List<IntPtr>(); EnumWindows((h, p) => { if (IsWindowVisible(h)) l.Add(h); return true; }, IntPtr.Zero); return l; }
  public static string Title(IntPtr h) { var s = new StringBuilder(512); GetWindowText(h, s, 512); return s.ToString(); }
}
'@
[void][W]::SetProcessDPIAware()
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(20, 20)
$found = [W]::All() | Where-Object { (([W]::Title($_)) -like $TitleLike) } | Select-Object -First 1
if (-not $found) { Write-Error "No window with a title like '$TitleLike'"; exit 2 }
$r = New-Object W+RECT
[void][W]::GetWindowRect($found, [ref]$r)
$w = $r.R - $r.L; $hh = $r.B - $r.T
[void][W]::ShowWindow($found, 9); [void][W]::SetForegroundWindow($found); Start-Sleep -Milliseconds 700
[void][W]::GetWindowRect($found, [ref]$r)
$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
$g.Dispose()
if ($MaxWidth -gt 0 -and $bmp.Width -gt $MaxWidth) {
  $nh = [int]($bmp.Height * $MaxWidth / $bmp.Width)
  $small = New-Object System.Drawing.Bitmap $MaxWidth, $nh
  $g2 = [System.Drawing.Graphics]::FromImage($small); $g2.InterpolationMode = 'HighQualityBicubic'; $g2.DrawImage($bmp, 0, 0, $MaxWidth, $nh); $g2.Dispose()
  $bmp.Dispose(); $bmp = $small
}
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
"saved $Out ($w x $hh) from '$([W]::Title($found))'"
