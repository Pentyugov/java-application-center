export namespace domain {
	
	export class AppSettings {
	    centralInfoPath: string;
	    applicationStartingDelaySec: number;
	    minimizeToTrayOnClose: boolean;
	    startQuietMode: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.centralInfoPath = source["centralInfoPath"];
	        this.applicationStartingDelaySec = source["applicationStartingDelaySec"];
	        this.minimizeToTrayOnClose = source["minimizeToTrayOnClose"];
	        this.startQuietMode = source["startQuietMode"];
	    }
	}
	export class EnvVariable {
	    name: string;
	    value: string;
	    isActive: boolean;
	
	    static createFrom(source: any = {}) {
	        return new EnvVariable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.value = source["value"];
	        this.isActive = source["isActive"];
	    }
	}
	export class ApplicationInfo {
	    appName: string;
	    envVariables: EnvVariable[];
	    appArguments: string[];
	    baseDir: string;
	    jarPath: string;
	    startOrder: number;
	    isActive: boolean;
	    hasGit: boolean;
	    hasMaven: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ApplicationInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.appName = source["appName"];
	        this.envVariables = this.convertValues(source["envVariables"], EnvVariable);
	        this.appArguments = source["appArguments"];
	        this.baseDir = source["baseDir"];
	        this.jarPath = source["jarPath"];
	        this.startOrder = source["startOrder"];
	        this.isActive = source["isActive"];
	        this.hasGit = source["hasGit"];
	        this.hasMaven = source["hasMaven"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Branches {
	    Current: string;
	    Local: string[];
	    Remote: string[];
	
	    static createFrom(source: any = {}) {
	        return new Branches(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Current = source["Current"];
	        this.Local = source["Local"];
	        this.Remote = source["Remote"];
	    }
	}
	export class CentralInfo {
	    globalVariables: EnvVariable[];
	    applicationInfos: ApplicationInfo[];
	
	    static createFrom(source: any = {}) {
	        return new CentralInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.globalVariables = this.convertValues(source["globalVariables"], EnvVariable);
	        this.applicationInfos = this.convertValues(source["applicationInfos"], ApplicationInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace dto {
	
	export class EnvVariableDTO {
	    name: string;
	    value: string;
	    isActive: boolean;
	
	    static createFrom(source: any = {}) {
	        return new EnvVariableDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.value = source["value"];
	        this.isActive = source["isActive"];
	    }
	}
	export class ApplicationInfoDTO {
	    appName: string;
	    envVariables: EnvVariableDTO[];
	    appArguments: string[];
	    baseDir: string;
	    jarPath: string;
	    startOrder: number;
	    isActive: boolean;
	    pid: number;
	    hasGit: boolean;
	    hasMaven: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ApplicationInfoDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.appName = source["appName"];
	        this.envVariables = this.convertValues(source["envVariables"], EnvVariableDTO);
	        this.appArguments = source["appArguments"];
	        this.baseDir = source["baseDir"];
	        this.jarPath = source["jarPath"];
	        this.startOrder = source["startOrder"];
	        this.isActive = source["isActive"];
	        this.pid = source["pid"];
	        this.hasGit = source["hasGit"];
	        this.hasMaven = source["hasMaven"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CentralInfoDTO {
	    globalVariables: EnvVariableDTO[];
	    applicationInfos: ApplicationInfoDTO[];
	
	    static createFrom(source: any = {}) {
	        return new CentralInfoDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.globalVariables = this.convertValues(source["globalVariables"], EnvVariableDTO);
	        this.applicationInfos = this.convertValues(source["applicationInfos"], ApplicationInfoDTO);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class PickBaseApplicationFolderDTO {
	    baseDir: string;
	    jarPaths: string[];
	
	    static createFrom(source: any = {}) {
	        return new PickBaseApplicationFolderDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.baseDir = source["baseDir"];
	        this.jarPaths = source["jarPaths"];
	    }
	}
	export class RunningProcessDTO {
	    path: string;
	    pid: number;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new RunningProcessDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.pid = source["pid"];
	        this.name = source["name"];
	    }
	}

}

export namespace util {
	
	export class CommandResult {
	    path: string;
	    pid: number;
	    // Go type: time
	    started: any;
	
	    static createFrom(source: any = {}) {
	        return new CommandResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.pid = source["pid"];
	        this.started = this.convertValues(source["started"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

