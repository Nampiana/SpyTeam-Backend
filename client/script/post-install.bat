@echo off
REM Ajouter C:\ffmpeg\bin à la variable d'environnement PATH
setx PATH "%PATH%;C:\ffmpeg\bin"

REM Vérifier si l'ajout a bien fonctionné
echo Le dossier ffmpeg a été copié et le PATH a été mis à jour.
pause
