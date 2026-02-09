export class RunningProcesses {
  pid: number
  path: string
  name: string

  constructor(pid: number, path: string, name: string) {
    this.pid = pid;
    this.path = path;
    this.name = name;
  }
}
