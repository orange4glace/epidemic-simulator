export class Shader {

  private attributeMap: Map<string, number> = new Map();
  private uniformMap: Map<string, WebGLUniformLocation> = new Map();

  private program_: WebGLProgram;
  public get program() { return this.program_; }

  constructor(
    private readonly gl_: WebGL2RenderingContext,
    vertShaderSource: string,
    fragShaderSource: string,
    attributes?: string[],
    uniforms?: string[]
  ) {
    this.program_ = this.createProgramFromSources(
      vertShaderSource, fragShaderSource);

    if (attributes) {
      attributes.forEach(attr => {
        const idx = this.gl_.getAttribLocation(this.program, attr);
        this.attributeMap.set(attr, idx);
        console.log(attr, idx);
      })
    }
    if (uniforms) {
      uniforms.forEach(uniform => {
        const idx = this.gl_.getUniformLocation(this.program, uniform);
        this.uniformMap.set(uniform, idx);
        console.log(uniform, idx);
      })
    }
  }

  public getAttributeLocation(attrib: string) {
    return this.attributeMap.get(attrib);
  }

  public getUniformLocation(uniform: string) {
    return this.uniformMap.get(uniform);
  }

  private loadShader(source: string, type: number): WebGLShader {
    const shader = this.gl_.createShader(type);
    this.gl_.shaderSource(shader, source);
    this.gl_.compileShader(shader);
    const compiled = this.gl_.getShaderParameter(shader, this.gl_.COMPILE_STATUS);
    if (!compiled) {
      const err = this.gl_.getShaderInfoLog(shader);
      console.error('Failed to compile shader', err);
      this.gl_.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(shaders: WebGLShader[]): WebGLProgram {
    const program = this.gl_.createProgram();
    shaders.forEach(shader => {
      this.gl_.attachShader(program, shader);
    })
    this.gl_.linkProgram(program);
    const linked = this.gl_.getProgramParameter(program, this.gl_.LINK_STATUS);
    if (!linked) {
      const err = this.gl_.getProgramInfoLog(program);
      console.error('Failed to link program', err);
      this.gl_.deleteProgram(program);
      return null;
    }
    return program;
  }

  private createProgramFromSources(vertSource: string, fragSource: string): WebGLProgram {
    const shaders: WebGLShader[] = [];
    shaders.push(this.loadShader(vertSource, this.gl_.VERTEX_SHADER));
    shaders.push(this.loadShader(fragSource, this.gl_.FRAGMENT_SHADER));
    return this.createProgram(shaders);
  }

}