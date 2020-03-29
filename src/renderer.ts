import { IPerson, SIRState } from './person';
import { ISociety } from './society';
import { IWorld } from './world';
import { Shader } from './shader';
import { Society } from './society-impl';
import { World } from './world-impl';
import { Engine } from './engine';
import { ColorPalette } from './color';
import { SIRModel } from './sir-model';
import { Person } from './person-impl';

class PersonRenderData {
  readonly person: IPerson;
}

const CIRCLE_DETAIL = 8;
const RIPPLE_DETAIL = 16;

export class Renderer {

  private gl_: WebGL2RenderingContext;

  private peopleRenderData_: PersonRenderData[] = [];

  private width_: number;
  public get width() { return this.width_; }
  private height_: number;
  public get height() { return this.height_; }
  private ratio_: number;
  public get ratio() { return this.ratio_; }

  public setSize(w: number, h: number): void {
    this.width_ = w;
    this.height_ = h;
  }

  private solidShader: Shader;
  private solidPositionBuffer: WebGLBuffer;
  private solidVAO: WebGLVertexArrayObject;

  private texShader: Shader;
  private texPositionBuffer: WebGLBuffer;
  private texVertexBuffer: WebGLBuffer;
  private texTexCoordBuffer: WebGLBuffer;
  private texColorBuffer: WebGLBuffer;
  private texVAO: WebGLVertexArrayObject;

  private rippleShader: Shader;
  private ripplePositionBuffer: WebGLBuffer;
  private rippleVertexBuffer: WebGLBuffer;
  private rippleTexCoordBuffer: WebGLBuffer;
  private rippleColorBuffer: WebGLBuffer;
  private rippleTimeBuffer: WebGLBuffer;
  private rippleVAO: WebGLVertexArrayObject;

  private personVertices_: Float32Array;
  private personColorVertices_: Float32Array;
  private personTexVertices_: Float32Array;

  private rippleVertices_: Float32Array;
  private rippleColorVertices_: Float32Array;
  private rippleTexVertices_: Float32Array;
  private rippleTimeVertices_: Float32Array;

  private circleTexture_: WebGLTexture;

  constructor(
    private readonly box: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    width: number, height: number) {
    this.width_ = width;
    this.height_ = height;
    this.gl_ = canvas.getContext('webgl2', {
      premutipliedAlpha: false
    }) as any;
  }

  private loadTexture(src: string): Promise<WebGLTexture> {
    const gl = this.gl_;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const texture = this.gl_.createTexture();
        this.gl_.bindTexture(this.gl_.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, img);
        this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_MAG_FILTER, this.gl_.LINEAR);
        this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_MIN_FILTER, this.gl_.LINEAR_MIPMAP_NEAREST);
        this.gl_.generateMipmap(this.gl_.TEXTURE_2D);
        this.gl_.bindTexture(this.gl_.TEXTURE_2D, null);
        resolve(texture);
      };
      img.src = src;
    })
  }

  public async initialize(): Promise<void> {
    const gl = this.gl_;
    this.gl_.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    this.solidShader = new Shader(gl, 
        `#version 300 es
        uniform vec2 u_resolution;
        uniform vec2 u_worldPosition;
        in vec2 a_position;

        void main() {
          vec2 position = a_position + u_worldPosition;
          vec2 normalizedPosition = (position * vec2(2, 2) - u_resolution)
              / u_resolution;
          gl_Position = vec4(normalizedPosition * vec2(1, -1), 0.0, 1.0);
        }
      `, 
        `#version 300 es
        precision mediump float;
        uniform vec3 u_color;
        out vec4 outColor;

        void main() {
          outColor = vec4(u_color, 1.0);
        }
      `, ['a_position'], ['u_resolution', 'u_worldPosition', 'u_color']);
    this.solidPositionBuffer = gl.createBuffer();
    this.solidVAO = gl.createVertexArray();
    gl.bindVertexArray(this.solidVAO);
    gl.enableVertexAttribArray(
      this.solidShader.getAttributeLocation('a_position'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.solidPositionBuffer);
    gl.vertexAttribPointer(
      this.solidShader.getAttributeLocation('a_position'),
      2, gl.FLOAT, false, 0, 0);
    
    this.texShader = new Shader(gl, 
        `#version 300 es

        uniform vec2 u_resolution;
        in vec2 a_vertex;
        in vec2 a_position;
        in vec2 a_texCoord;
        in vec3 a_color;
        out vec2 v_texCoord;
        out vec3 v_color;

        void main() {
          vec2 position = a_vertex + a_position;
          vec2 normalizedPosition = (position * vec2(2, 2) - u_resolution)
              / u_resolution;
          gl_Position = vec4(normalizedPosition * vec2(1, -1), 0.0, 1.0);

          v_texCoord = a_texCoord;
          v_color = a_color;
        }
      `, 
        `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        in vec3 v_color;
        
        uniform sampler2D u_texture;
        out vec4 outColor;

        void main() {
          outColor = texture(u_texture, v_texCoord) * vec4(v_color, 1);
        }
      `, ['a_vertex', 'a_position', 'a_texCoord', 'a_color'],
         ['u_resolution', 'u_texture']);

    this.texPositionBuffer = gl.createBuffer();
    this.texVertexBuffer = gl.createBuffer();
    this.texTexCoordBuffer = gl.createBuffer();
    this.texColorBuffer = gl.createBuffer();

    this.texVAO = gl.createVertexArray();
    gl.bindVertexArray(this.texVAO);

    gl.enableVertexAttribArray(
      this.texShader.getAttributeLocation('a_vertex'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texVertexBuffer);
    gl.vertexAttribPointer(
      this.texShader.getAttributeLocation('a_vertex'),
      2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(
      this.texShader.getAttributeLocation('a_position'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texPositionBuffer);
    gl.vertexAttribPointer(
      this.texShader.getAttributeLocation('a_position'),
      2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(
      this.texShader.getAttributeLocation('a_position'),
      1);
      
    gl.enableVertexAttribArray(
      this.texShader.getAttributeLocation('a_texCoord'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texTexCoordBuffer);
    gl.vertexAttribPointer(
      this.texShader.getAttributeLocation('a_texCoord'),
      2, gl.FLOAT, false, 0, 0);
      
    gl.enableVertexAttribArray(
      this.texShader.getAttributeLocation('a_color'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texColorBuffer);
    gl.vertexAttribPointer(
      this.texShader.getAttributeLocation('a_color'),
      3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(
      this.texShader.getAttributeLocation('a_color'),
      1);

      
    this.rippleShader = new Shader(gl, 
        `#version 300 es
        precision mediump float;

        uniform vec2 u_resolution;
        in vec2 a_vertex;
        in vec2 a_position;
        in vec2 a_texCoord;
        in vec3 a_color;
        in float a_time;

        out vec2 v_texCoord;
        out vec3 v_color;
        out float v_time;
        out vec2 v_fragCoord;

        void main() {
          v_fragCoord = a_vertex;
          vec2 position = a_vertex + a_position;
          vec2 normalizedPosition = (position * vec2(2, 2) - u_resolution)
              / u_resolution;
          gl_Position = vec4(normalizedPosition * vec2(1, -1), 0.0, 1.0);

          v_texCoord = a_texCoord;
          v_color = a_color;
          v_time = a_time;
        }
      `, 
        `#version 300 es
        precision mediump float;

        uniform float u_radius;

        in vec2 v_texCoord;
        in vec3 v_color;
        in vec2 v_fragCoord;
        in float v_time;

        uniform sampler2D u_texture;

        out vec4 outColor;

        void main() {
          float len = length(v_fragCoord);
          float from = v_time * u_radius;
          float thickness = 10.0 * (1.0 - v_time);
          float to = from + thickness;
          outColor = vec4(0.0, 0.0, 0.0, 0.0);
          if (from <= len && len <= to) {
            outColor = texture(u_texture, v_texCoord) * vec4(v_color, 1.0 - v_time);
          }
        }
      `, ['a_vertex', 'a_position', 'a_texCoord', 'a_color', 'a_time'],
         ['u_resolution', 'u_radius', 'u_texture']);
    this.ripplePositionBuffer = gl.createBuffer();
    this.rippleVertexBuffer = gl.createBuffer();
    this.rippleTexCoordBuffer = gl.createBuffer();
    this.rippleColorBuffer = gl.createBuffer();
    this.rippleTimeBuffer = gl.createBuffer();
    this.rippleVAO = gl.createVertexArray();
    gl.bindVertexArray(this.rippleVAO);

    gl.enableVertexAttribArray(
      this.rippleShader.getAttributeLocation('a_position'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ripplePositionBuffer);
    gl.vertexAttribPointer(
      this.rippleShader.getAttributeLocation('a_position'),
      2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(
      this.rippleShader.getAttributeLocation('a_position'),
      1);

    gl.enableVertexAttribArray(
      this.rippleShader.getAttributeLocation('a_vertex'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleVertexBuffer);
    gl.vertexAttribPointer(
      this.rippleShader.getAttributeLocation('a_vertex'),
      2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(
      this.rippleShader.getAttributeLocation('a_texCoord'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleTexCoordBuffer);
    gl.vertexAttribPointer(
      this.rippleShader.getAttributeLocation('a_texCoord'),
      2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(
      this.rippleShader.getAttributeLocation('a_color'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleColorBuffer);
    gl.vertexAttribPointer(
      this.rippleShader.getAttributeLocation('a_color'),
      3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(
      this.rippleShader.getAttributeLocation('a_color'),
      1);
      
    gl.enableVertexAttribArray(
      this.rippleShader.getAttributeLocation('a_time'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleTimeBuffer);
    gl.vertexAttribPointer(
      this.rippleShader.getAttributeLocation('a_time'),
      1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(
      this.rippleShader.getAttributeLocation('a_time'),
      1);


    this.personVertices_ = new Float32Array(150000 * 2 * 6);
    this.personColorVertices_ = new Float32Array(150000 * 3);
    this.personTexVertices_ = new Float32Array(50 * 2 * 6);

    this.rippleVertices_ = new Float32Array(150000 * 2 * 6);
    this.rippleColorVertices_ = new Float32Array(150000 * 3);
    this.rippleTexVertices_ = new Float32Array(50 * 2 * 6);
    this.rippleTimeVertices_ = new Float32Array(150000 * 1);

    gl.activeTexture(gl.TEXTURE0);
    this.circleTexture_ = await this.loadTexture('./circle.png');
  }

  public renderPerson(person: IPerson) {

  }
  
  public drawWorld(world: World) {
  }

  public drawSociety(world: World) {
    const gl = this.gl_;
    gl.useProgram(this.solidShader.program);
    gl.bindVertexArray(this.solidVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.solidPositionBuffer);
    gl.uniform2f(
      this.solidShader.getUniformLocation('u_resolution'),
      this.width, this.height);
    gl.uniform2f(
      this.solidShader.getUniformLocation('u_worldPosition'),
      0, 0);

    const societies: Array<Society> = world.societies.slice(0);
    societies.push(world.quarantine);
    societies.forEach(society => {
      const x1 = society.transform.position.x;
      const x2 = x1 + society.width;
      const y1 = society.transform.position.y;
      const y2 = y1 + society.height;

      if (society.quarantine) {
        gl.uniform3f(this.solidShader.getUniformLocation('u_color'),
          0.6, 0.5, 0.2);
      }
      else {
        gl.uniform3f(this.solidShader.getUniformLocation('u_color'),
          0.4, 0.4, 0.4);
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x2, y2,
        x1, y2,
        x1, y1
      ]), gl.STATIC_DRAW);
      gl.drawArrays(gl.LINE_STRIP, 0, 5);
    })
  }

  public drawPeople(world: World) {
    const gl = this.gl_;
    gl.useProgram(this.texShader.program);
    gl.bindVertexArray(this.texVAO);

    gl.uniform2f(
      this.texShader.getUniformLocation('u_resolution'),
      this.width, this.height);
    gl.uniform2f(
      this.texShader.getUniformLocation('u_worldPosition'),
      0, 0);
    gl.uniform1i(
      this.texShader.getUniformLocation('u_texture'), 0);
    gl.bindTexture(gl.TEXTURE_2D, this.circleTexture_);
      
    let count = 0;
    const societies: Array<Society> = world.societies.slice(0);
    societies.push(world.quarantine);
    societies.forEach(society => {
      society.people.forEach(person => {
        const x = person.transform.position.x;
        const y = person.transform.position.y;
        this.personVertices_.set(
          [x, y], count * 2);
        switch (person.state) {
          case SIRState.Suspectible:
            this.personColorVertices_.set([
              ColorPalette.PERSON_SUSCEPTIBLE.r,
              ColorPalette.PERSON_SUSCEPTIBLE.g,
              ColorPalette.PERSON_SUSCEPTIBLE.b], count * 3);
          break;
          case SIRState.Infectious:
            this.personColorVertices_.set([
              ColorPalette.PERSON_INFECTED.r,
              ColorPalette.PERSON_INFECTED.g,
              ColorPalette.PERSON_INFECTED.b], count * 3);
          break;
          case SIRState.Infectious_Unknown:
            this.personColorVertices_.set([
              ColorPalette.PERSON_INFECTED_UNKNOWN.r,
              ColorPalette.PERSON_INFECTED_UNKNOWN.g,
              ColorPalette.PERSON_INFECTED_UNKNOWN.b], count * 3);
          break;
          case SIRState.Recovered:
            this.personColorVertices_.set([
              ColorPalette.PERSON_RECOVERED.r,
              ColorPalette.PERSON_RECOVERED.g,
              ColorPalette.PERSON_RECOVERED.b], count * 3);
          break;
        }
        count++;
      })
    })

    // gl.bindBuffer(gl.ARRAY_BUFFER, this.texVertexBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    //       -50, -50,
    //       50, -50,
    //       50, 50,
    //       50, -50,
    //       -50, -50]), gl.STATIC_DRAW);

    // gl.bindBuffer(gl.ARRAY_BUFFER, this.texTexCoordBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, 
    //   new Float32Array([
    //       0, 0,
    //       1, 0,
    //       1, 1,
    //       0, 1,
    //       0, 0]), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -5, -5,
          5, -5,
          5, 5,
          -5, -5,
          -5, 5,
          5, 5]), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array([
          0, 0,
          1, 0,
          1, 1,
          0, 0,
          0, 1,
          1, 1]), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array(this.personVertices_.buffer, 0, count * 2),
        gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array(this.personColorVertices_.buffer, 0, count * 3),
        gl.STATIC_DRAW);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
  }

  public drawRipple(world: World) {
    const gl = this.gl_;
    gl.useProgram(this.rippleShader.program);
    gl.bindVertexArray(this.rippleVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ripplePositionBuffer);

    gl.uniform2f(
      this.rippleShader.getUniformLocation('u_resolution'),
      this.width, this.height);
    gl.uniform1f(
      this.rippleShader.getUniformLocation('u_radius'), SIRModel.infectionRadius);
    gl.uniform1i(
      this.rippleShader.getUniformLocation('u_texture'), 0);
    gl.bindTexture(gl.TEXTURE_2D, this.circleTexture_);

    let count = 0;
    world.societies.forEach(society => {
      society.people.forEach(person => {
        if (!person.hasRipple) return;
        const x = person.transform.position.x;
        const y = person.transform.position.y;
        this.rippleVertices_.set(
          [x, y], count * 2);

        
        switch (person.state) {
          case SIRState.Suspectible:
            this.rippleColorVertices_.set([
              ColorPalette.PERSON_SUSCEPTIBLE.r,
              ColorPalette.PERSON_SUSCEPTIBLE.g,
              ColorPalette.PERSON_SUSCEPTIBLE.b], count * 3);
          break;
          case SIRState.Infectious:
            this.rippleColorVertices_.set([
              ColorPalette.PERSON_INFECTED.r,
              ColorPalette.PERSON_INFECTED.g,
              ColorPalette.PERSON_INFECTED.b], count * 3);
          break;
          case SIRState.Infectious_Unknown:
            this.rippleColorVertices_.set([
              ColorPalette.PERSON_INFECTED_UNKNOWN.r,
              ColorPalette.PERSON_INFECTED_UNKNOWN.g,
              ColorPalette.PERSON_INFECTED_UNKNOWN.b], count * 3);
          break;
          case SIRState.Recovered:
            this.rippleColorVertices_.set([
              ColorPalette.PERSON_RECOVERED.r,
              ColorPalette.PERSON_RECOVERED.g,
              ColorPalette.PERSON_RECOVERED.b], count * 3);
          break;
        }

        this.rippleTimeVertices_[count] =
            (Engine.elasped - person.rippleStartedTime)
            % Person.RIPPLE_DURATION / Person.RIPPLE_DURATION;

        count++;
      });
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -SIRModel.infectionRadius, -SIRModel.infectionRadius,
          SIRModel.infectionRadius, -SIRModel.infectionRadius,
          SIRModel.infectionRadius, SIRModel.infectionRadius,
          -SIRModel.infectionRadius, -SIRModel.infectionRadius,
          -SIRModel.infectionRadius, SIRModel.infectionRadius,
          SIRModel.infectionRadius, SIRModel.infectionRadius]),
      gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array([
          0, 0,
          1, 0,
          1, 1,
          0, 0,
          0, 1,
          1, 1]), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.ripplePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array(this.rippleVertices_.buffer, 0, count * 2),
        gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array(this.rippleColorVertices_.buffer, 0, count * 3),
        gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleTimeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array(this.rippleTimeVertices_.buffer, 0, count),
        gl.STATIC_DRAW);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
  }

  public draw(world: World): void {
    this.canvas.width = this.box.offsetWidth;
    this.canvas.height = this.box.offsetHeight;
    this.ratio_ = Math.min(this.canvas.width / this.width,
                           this.canvas.height / this.height);
    const w = this.width * this.ratio_;
    const h = this.height * this.ratio_;
    this.gl_.viewport(0, this.canvas.height - h, w, h);

    this.gl_.clearColor(0, 0, 0, 0);
    this.gl_.clear(this.gl_.COLOR_BUFFER_BIT | this.gl_.DEPTH_BUFFER_BIT);

    this.drawSociety(world);
    this.drawRipple(world);
    this.drawPeople(world);
  }

}