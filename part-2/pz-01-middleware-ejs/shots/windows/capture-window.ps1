# Saves the visible rectangle of one real window (without the invisible resize border, so nothing of the neighbouring
# windows shows through) as a PNG. The window is found by its title (-WinTitle) or by the id of its process (-ProcId).
param([string]$WinTitle, [int]$ProcId, [Parameter(Mandatory)][string]$Out)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;using System.Runtime.InteropServices;
public class W{
[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")]public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")]public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int ht,uint f);
[DllImport("dwmapi.dll")]public static extern int DwmGetWindowAttribute(IntPtr h,int a,out R r,int s);
public struct R{public int L,T,Rt,B;}}
"@
[W]::SetProcessDPIAware() | Out-Null
$proc = if ($ProcId) { Get-Process -Id $ProcId } else { Get-Process | Where-Object { $_.MainWindowTitle -eq $WinTitle } | Select-Object -First 1 }
if (-not $proc -or $proc.MainWindowHandle -eq 0) { throw 'window not found' }
$h = $proc.MainWindowHandle
# Topmost for the moment of the capture, so that no other window (the desktop is shared) covers it.
[W]::SetWindowPos($h, [IntPtr](-1), 0, 0, 0, 0, 3) | Out-Null
[W]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 900
$r = New-Object W+R
[W]::DwmGetWindowAttribute($h, 9, [ref]$r, 16) | Out-Null
$w = $r.Rt - $r.L; $ht = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.L, $r.T, 0, 0, (New-Object System.Drawing.Size $w, $ht))
[W]::SetWindowPos($h, [IntPtr](-2), 0, 0, 0, 0, 3) | Out-Null
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
"$w x $ht"
