export class EnvVariable {
  name: string;
  value: string;
  isActive: boolean;

  constructor() {
    this.name = '';
    this.value = '';
    this.isActive = true;
  }

}
