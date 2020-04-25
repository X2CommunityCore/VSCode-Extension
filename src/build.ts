/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Firaxis Games. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { window } from 'vscode';
import * as fs from 'fs';
import { getXComSDKTerminal, getWorkspaceName, delay } from './xcomsdkutility';
import { TextDecoder } from 'util';
import { Z_FIXED } from 'zlib';

/**
 * Build scripts for the currently active mod
 */
export async function buildScripts() 
{   
    // make sure we have a workspace
    var workspaceName = getWorkspaceName();
    if( workspaceName === "undefined" )
    {
        window.showErrorMessage(`No workspace loaded, cancelling build`);
        return;
    }
    
    // produce paths + command
    var devRoot = (vscode.workspace.getConfiguration().get('conf.Paths.XCOM-SDKInstallPath') as string);
    var modPath = devRoot + "/Development/Src/" + workspaceName;    
    var command = "make -mods " + workspaceName + " \"" + modPath + "\"";

    // delete the module from the scripts output folder if it already exists
    var compiledModulePath = devRoot + "/XComGame/Script/" + workspaceName + ".u";
    if( fs.existsSync(compiledModulePath) )
    {
        fs.unlinkSync(compiledModulePath);
    }

    //Watch the launch log for compile results
    var bReportedLaunch = false;
    var logFilePath = devRoot + "/XComGame/Logs/Launch.log";
    if( !fs.existsSync(logFilePath) )
    {
        // We know that XComGame exists, make sure Logs exists
        var logsDir = devRoot + "/XComGame/Logs/";
        if( !fs.existsSync(logsDir) )
        {
            fs.mkdirSync(logsDir);
        }
        
        var stream = fs.createWriteStream(logFilePath);
        stream.write('placeholder');
        stream.close();
    }

    var watchHandle = fs.watch( logFilePath, function(event, trigger) {
        var logOutput = fs.readFileSync(logFilePath);
        var dec = new TextDecoder();
        var fileString = dec.decode(logOutput);

        var startedCommandletMatch = fileString.indexOf("Executing Class UnrealEd.MakeCommandlet");
        var finishedCommandletMatch = fileString.indexOf("Log: Success - 0 error(s)");        
        var builtModuleCommandletMatch = fileString.indexOf("----" + workspaceName);
        if( startedCommandletMatch > -1 )
        {
            if( finishedCommandletMatch > -1 && builtModuleCommandletMatch > -1)
            {
                window.showInformationMessage("Script compile SUCCEEDED");
                watchHandle.close();
            }
            else if( finishedCommandletMatch > -1 && builtModuleCommandletMatch < 0 )
            {
                window.showErrorMessage("Script compile did not build your module " + workspaceName + "!\nCheck your mod's INI files to make sure it is being included in the script package lists.");
                watchHandle.close();
            }
            else
            {                    
                window.showErrorMessage("Script compile FAILED. Check for errors in your source files.");
                watchHandle.close();
            }
        }
        else
        {
            if( !bReportedLaunch )
            {
                window.showInformationMessage("XComGame.exe launched...");
                bReportedLaunch = true;
            }                
        }
    });

    // compile scripts
    buildInternal(command);
}

export async function buildShaderCache() 
{
    // make sure we have a workspace
    var workspaceName = getWorkspaceName();
    if( workspaceName === "undefined" )
    {
        window.showErrorMessage(`No workspace loaded, cancelling build`);
        return;
    }
    
    // produce paths + command    
    var command = "precompileshaders -nopause platform=pc_sm4 DLC=" + workspaceName;

    // compile mod shader cache
    buildInternal(command);
}
    
async function buildInternal(command: string)
{
    // Fetch the path to the templates
    const configuration = vscode.workspace.getConfiguration();
    var stdPathStr = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var pathStr = stdPathStr + "/Binaries/Win64/";    
    
    // Run the make command within the terminal
    var useTerminal: vscode.Terminal = getXComSDKTerminal();
    if( useTerminal )
    {
        //Force focus on the XCOM SDK terminal        
        useTerminal.show();
           
        var SetLocationCommand = "cd \"" + pathStr + "\"";
        await useTerminal.sendText(SetLocationCommand, true);
    
        var BuildCommand = ".\\XComGame.com " + command;
        await useTerminal.sendText(BuildCommand, true);
    }
}