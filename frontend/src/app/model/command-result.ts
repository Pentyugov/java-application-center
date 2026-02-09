export class CommandResult {
  path: string
  pid: number;

  constructor(path: string, pid: number) {
    this.path = path;
    this.pid = pid;
  }

}
