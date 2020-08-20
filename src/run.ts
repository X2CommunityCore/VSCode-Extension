/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Firaxis Games. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { workspace, window, Uri } from 'vscode';
import * as fs from 'fs';
import { TextEncoder, TextDecoder } from 'util';
import { getXComSDKTerminal, getWorkspaceName, copyDirectory } from './xcomsdkutility';

async function updateModOptions(iniFilePath: Uri)
{
    var workspaceName = getWorkspaceName();

    fs.readFile(iniFilePath.fsPath, function (err, byteArray)
    {
        // Convert to string, replace
        var dec = new TextDecoder();
        var fileString = dec.decode(byteArray);
        
        // Make sure the mod options has an entry for this mod. If not add one.
        var findString = "ActiveMods=" + workspaceName;
        if( fileString.indexOf(findString) < 0)
        {
            // Branch based on whether there is a trailing new line or not
            var lastChar = fileString[fileString.length - 1];
            if( lastChar === '\n' )
            {
                fileString += findString;
            }
            else
            {
                fileString += "\n" + findString;
            }

            // Encode and write back (UTF-8)
            var enc = new TextEncoder();
            vscode.workspace.fs.writeFile(iniFilePath, enc.encode(fileString));
        }
    });
}

/**
 * Start the XCOM editor
 */
export async function runEditor() {
    const configuration = vscode.workspace.getConfiguration();
    var sdkPath = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;

    var useTerminal: vscode.Terminal = getXComSDKTerminal();
    if( useTerminal )
    {
        useTerminal.show();
        var gameExePath = sdkPath + "/Binaries/Win64/";
        var SetLocationCommand = "cd \"" + gameExePath + "\"";
        await useTerminal.sendText(SetLocationCommand, true);

        var LaunchCommand = ".\\XComGame.exe editor";
        await useTerminal.sendText(LaunchCommand, true);
    }
}

/**
 * Deploy the mod files to the game's directories, set the INIs to activate the mod, then launch XCOM
 */
export async function runMod() {
    
    // Build the paths we'll use
    const configuration = vscode.workspace.getConfiguration();
    var sdkPath = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var pathToModSrcDir = vscode.workspace.rootPath as string;
    
    var workspaceName = getWorkspaceName();
    if( workspaceName === "undefined" )
    {
        window.showInformationMessage(`No workspace loaded, cancelling run`);
        return;
    }

    var gamePath = configuration.get('conf.Paths.GameInstallPath') as string;

    // Make the mods sub folder if needed
    if( !fs.existsSync(gamePath + "/XComGame/Mods/") )
    {
        fs.mkdirSync(gamePath + "/XComGame/Mods/");
    }

    var useTerminal: vscode.Terminal = getXComSDKTerminal();
    if( useTerminal )
    {
        useTerminal.show();
        
        // Deploy to the XCOM game directory
        window.showInformationMessage(`Deploying mod files to the XCom game directory...`);

        var pathToGameDir = gamePath + "/XComGame/Mods/" + workspaceName;

        // Base dir, copy files
        try {
            window.showInformationMessage(`Copying base files...`);
            await copyDirectory(pathToModSrcDir, pathToGameDir);
            await copyDirectory(pathToModSrcDir + "/Config", pathToGameDir + "/Config");
            await copyDirectory(pathToModSrcDir + "/Localization", pathToGameDir + "/Localization");
        }
        catch(error) {
            window.showInformationMessage(`FAILED to copy BASE FILES! Reason: ` + error + ` Check your path user settings the XCOM SDK.`);
        }        

        // Are there script classes? if so copy the compiled script module
        if( fs.existsSync(pathToModSrcDir + "/Classes") )
        {
            window.showInformationMessage(`Copying compiled script module...`);
            var moduleFilename = workspaceName + ".u";
            try {
                if( !fs.existsSync(pathToGameDir +"/Script/") )
                {
                    fs.mkdirSync(pathToGameDir +"/Script/");
                }
                await fs.copyFileSync(sdkPath + "/XComGame/Script/" + moduleFilename, pathToGameDir +"/Script/" + moduleFilename);
            }
            catch(error) {
                window.showInformationMessage(`FAILED to copy SCRIPT MODULE! Reason: ` + error + ` Check your path user settings the XCOM SDK.`);
            }
        }

        var modContentDir = sdkPath + "/XComGame/Content/Mods/" + workspaceName;
        if( fs.existsSync(modContentDir) )
        {
            window.showInformationMessage(`Copying content packages...`);            
            try {
                await copyDirectory(modContentDir, pathToGameDir + "/Content");
            }
            catch(error) {
                window.showInformationMessage(`FAILED to copy CONTENT PACKAGES! Reason: ` + error + ` Check your path user settings the XCOM SDK.`);
            }
        }

        window.showInformationMessage(`Updating DefaultModOptions.ini to enable the mod ...`);

        // Ensure the modoptions.ini has an entry for the mod
        var modOptionsIniPath = gamePath + "/XComGame/Config/DefaultModOptions.ini";
        updateModOptions(vscode.Uri.file(modOptionsIniPath));

        var gameExePath = gamePath + "/Binaries/Win64/";
        var SetLocationCommand = "cd \"" + gameExePath + "\"";
        await useTerminal.sendText(SetLocationCommand, true);
    
        var LaunchCommand = ".\\xcom.exe -allowconsole -showlog";
        await useTerminal.sendText(LaunchCommand, true);
    }
}