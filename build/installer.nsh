; Capacinator Windows Installer Custom Script
; This script provides custom installation and uninstallation logic for NSIS

!verbose 3

; ============================================================================
; Custom Installation Logic
; ============================================================================
!macro customInstall
  ; Log installation details
  DetailPrint "Installing Capacinator to $INSTDIR"

  ; Create registry entry for installation path
  WriteRegStr HKCU "Software\Capacinator" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\Capacinator" "Version" "${VERSION}"
  WriteRegStr HKCU "Software\Capacinator" "InstallDate" "$%DATE%"

  ; Log successful installation
  DetailPrint "Installation completed successfully"
!macroend

; ============================================================================
; Custom Uninstallation Logic
; ============================================================================
!macro customUnInstall
  ; Log uninstallation start
  DetailPrint "Uninstalling Capacinator..."

  ; Remove application data from user profile
  ; This includes user preferences, database files, and cache
  DetailPrint "Removing application data from $APPDATA\Capacinator"
  RMDir /r "$APPDATA\Capacinator"

  ; Remove local application data (cache, temp files)
  DetailPrint "Removing cached data from $LOCALAPPDATA\Capacinator"
  RMDir /r "$LOCALAPPDATA\Capacinator"

  ; Remove registry keys
  DetailPrint "Removing registry entries"
  DeleteRegKey HKCU "Software\Capacinator"

  ; Remove desktop shortcut if it still exists
  ; (User may have deleted it manually, so we check first)
  IfFileExists "$DESKTOP\Capacinator.lnk" 0 +2
    Delete "$DESKTOP\Capacinator.lnk"

  ; Remove Start Menu folder
  DetailPrint "Removing Start Menu shortcuts"
  RMDir /r "$SMPROGRAMS\Capacinator"

  ; Clean up any leftover temporary files
  DetailPrint "Cleaning up temporary files"
  Delete "$TEMP\Capacinator-*.log"
  Delete "$TEMP\capacinator-*.tmp"

  ; Log successful uninstallation
  DetailPrint "Uninstallation completed successfully"
!macroend

; ============================================================================
; Custom Header (Optional)
; ============================================================================
!macro customHeader
  ; This macro runs before the installer starts
  ; Can be used for pre-installation checks or logging
  !verbose 3
  !echo "Capacinator Windows Installer - Custom NSIS Script Loaded"
!macroend

; ============================================================================
; Custom Init (Optional)
; ============================================================================
!macro customInit
  ; This macro runs during installer initialization
  ; Can be used for environment checks or prerequisites

  ; Check if previous version is installed
  ReadRegStr $0 HKCU "Software\Capacinator" "InstallPath"
  ${If} $0 != ""
    DetailPrint "Found previous installation at: $0"
    ; Previous version exists - installer will handle upgrade automatically
  ${Else}
    DetailPrint "No previous installation detected - performing fresh install"
  ${EndIf}
!macroend

; ============================================================================
; Custom Installer Pages (Optional)
; ============================================================================
; Uncomment below to add custom installer pages
;
; !macro customInstallPage
;   Page custom CustomPageFunction
; !macroend
;
; Function CustomPageFunction
;   ; Custom page implementation
; FunctionEnd

; ============================================================================
; Notes
; ============================================================================
; This script is included by electron-builder during NSIS installer creation.
; The macros defined here extend the default installer behavior.
;
; Available macros:
; - customInstall: Runs during installation (after files are copied)
; - customUnInstall: Runs during uninstallation (before files are removed)
; - customHeader: Runs before installer starts
; - customInit: Runs during installer initialization
;
; Common NSIS variables:
; - $INSTDIR: Installation directory
; - $APPDATA: User AppData\Roaming folder
; - $LOCALAPPDATA: User AppData\Local folder
; - $DESKTOP: User desktop folder
; - $SMPROGRAMS: User Start Menu Programs folder
; - $TEMP: Temporary files folder
;
; For more information:
; - NSIS Documentation: https://nsis.sourceforge.io/Docs/
; - electron-builder NSIS: https://www.electron.build/configuration/nsis
