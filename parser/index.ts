import * as flatten from "array-flatten";
import { isNode } from "browser-or-node";
import { isNull } from "../src/utils/checks";
import { warnOrThrow } from "../src/utils/logs";
import {
  downloadVastAndWrappersAsync,
  downloadVastAndWrappersSync
} from "../src/utils/vast";
import VastElement from "../src/vast-element";

type VastElements = Array<VastElement<any>>;

export default class VastParser {
  public vasts: VastElements;
  public parsed: boolean;
  public originalVastUrl: string;
  public options: VastParserOptions;

  constructor(vastUrl: string, options: VastParserOptions = {}) {
    this.originalVastUrl = vastUrl;
    this.options = options;
  }

  public parseAsync(callback: (self: this) => void) {
    if (this.parsed) {
      callback(this);
    }
    downloadVastAndWrappersAsync(
      this.originalVastUrl,
      this.options,
      (vasts: VastElements) => {
        this.vasts = vasts;
        this.parsed = true;
        callback(this);
      }
    );
  }

  public parseSync(): this {
    if (isNode) {
      throw new Error("parseSync is only available in a browser context");
    }
    if (this.parsed) {
      return this;
    }
    this.vasts = downloadVastAndWrappersSync(
      this.originalVastUrl,
      this.options
    );
    this.parsed = true;
    return this;
  }

  public getVasts(): VastElements {
    return this.vasts || [];
  }

  public getVastElements(
    arrayOfTagNames: /* PossibleTag[] */ string[]
  ): VastElements {
    return this.get(arrayOfTagNames);
  }

  public getContents(arrayOfTagNames: /* PossibleTag[] */ string[]): string[] {
    return this.get(arrayOfTagNames, "content");
  }

  public getAttributes(
    arrayOfTagNames: /* PossibleTag[] */ string[],
    attribute: string
  ): string[] {
    return this.get(arrayOfTagNames, attribute);
  }

  // > return an array all childs find at "arrayOfTagNames" path in the hierarchy
  // * getChilds(arrayOfTagNames: Array<string>, details: 'content' | string): Array<VastElement>
  private get(arrayOfTagNames: /* PossibleTag[] */ string[]): VastElements;
  private get(
    arrayOfTagNames: /* PossibleTag[] */ string[],
    details: "content" | /* "PossibleAttrs" */ string
  ): string[];
  private get(
    arrayOfTagNames: /* PossibleTag[] */ string[],
    details?: "content" | /* "PossibleAttrs" */ string
  ) {
    const vastElements = (flatten(
      this.vasts.map(v => v.get(arrayOfTagNames, true))
    ) as unknown) as VastElements;
    if (details) {
      return vastElements.map(vastElement => {
        if (details === "content") {
          if (isNull(vastElement.content)) {
            warnOrThrow(
              `${vastElement.name} does not have content`,
              this.options
            );
          }
          return vastElement.content;
        } else {
          const attributeLowerCased = {};
          Object.keys(vastElement.attrs).forEach(attr => {
            attributeLowerCased[attr.toLowerCase()] = vastElement.attrs[attr];
          });
          if (isNull(attributeLowerCased[details.toLowerCase()])) {
            warnOrThrow(
              `${vastElement.name} does not have content`,
              this.options
            );
          }
          return attributeLowerCased[details.toLowerCase()];
        }
      });
    }
    return vastElements;
  }
}