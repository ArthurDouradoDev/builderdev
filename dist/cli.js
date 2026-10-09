#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap3 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar3 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar3(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap3;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar3;
    exports.isSeq = isSeq2;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path) {
      const ctrl = callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = visit_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path) {
      const ctrl = await callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path) {
      if (typeof visitor === "function")
        return visitor(key, node, path);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path);
      return void 0;
    }
    function replaceNode(key, path, node) {
      const parent = path[path.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle2, prefix] = parts;
            this.tags[handle2] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle2, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle2];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle2 === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle2, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle2 + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle2, prefix] of tagEntries) {
          if (handle2 === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle2} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
          let data = anchors2.get(found);
          if (!data) {
            toJS.toJS(found, null, ctx);
            data = anchors2.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors2);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path, value) {
      let v = value;
      for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path, value) {
        if (isEmptyPath(path))
          this.add(value);
        else {
          const [key, ...rest] = path;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify3(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify3;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify3 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify3.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify3.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify3 = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify3.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify3 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify4 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify4(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify3.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify3.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify3 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify3.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify3.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify3.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        if (Collection.isEmptyPath(path)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (Collection.isEmptyPath(path))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        if (Collection.isEmptyPath(path)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep: sep6, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep6?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep6) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep6 ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep6, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep6 = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep6 + cb;
              sep6 = "";
              break;
            }
            case "newline":
              if (comment)
                sep6 += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap3 = fc.start.source === "{";
      const fcName = isMap3 ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap3 ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep: sep6, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep6?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep6 && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap3 && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap3 && !sep6 && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep6, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep6 ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap3 && !props.found && ctx.options.strict) {
              if (sep6)
                for (const st of sep6) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep6, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap3) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap3 ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep6 = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep6 + indent.slice(trimIndent) + content;
          sep6 = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep6 === " ")
            sep6 = "\n";
          else if (!prevMoreIndented && sep6 === "\n")
            sep6 = "\n\n";
          value += sep6 + indent.slice(trimIndent) + content;
          sep6 = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep6 === "\n")
            value += "\n";
          else
            sep6 = "\n";
        } else {
          value += sep6 + content;
          sep6 = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return unfoldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function unfoldLines(source) {
      const line = /(.*?)\r?\n/sy;
      let match = line.exec(source);
      if (!match)
        return source;
      let trimEnd, trimBoth;
      try {
        trimEnd = new RegExp("(?<![ 	])[ 	]+$");
        trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
      } catch {
        trimEnd = /[ \t]+$/;
        trimBoth = /^[ \t]+|[ \t]+$/g;
      }
      let res = match[1].replace(trimEnd, "");
      let sep6 = " ";
      let pos = line.lastIndex;
      while (match = line.exec(source)) {
        const lm = match[1].replace(trimBoth, "");
        if (lm === "") {
          if (sep6 === "\n")
            res += sep6;
          else
            sep6 = "\n";
        } else {
          res += sep6 + lm;
          sep6 = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep6 + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify3 = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep: sep6, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep6)
        for (const st of sep6)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify3;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path) => {
      let item = cst;
      for (const [field, index] of path) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path) => {
      const parent = visit.itemAtPath(cst, path.slice(0, -1));
      const field = path[path.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path, item, visitor) {
      let ctrl = visitor(item, path);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar3 = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar3;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter3 = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter3;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep6;
          if (scalar.end) {
            sep6 = scalar.end;
            sep6.push(this.sourceToken);
            delete scalar.end;
          } else
            sep6 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep: sep6 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep6 = it.sep;
                  sep6.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep: sep6 }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep6 = fc.end.splice(1, fc.end.length);
            sep6.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep: sep6 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument3(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument3(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify3(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument3;
    exports.stringify = stringify3;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// src/cli.ts
import { spawn } from "node:child_process";
import { existsSync as existsSync17, readFileSync as readFileSync16, readdirSync as readdirSync6, statSync as statSync7 } from "node:fs";
import { basename as basename5, delimiter, join as join20, relative as relative6, resolve as resolve10, sep as sep5 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { parseArgs } from "node:util";

// package.json
var package_default = {
  name: "builderdev",
  version: "0.1.0",
  description: "Planos por fases com status derivado do git, mem\xF3ria com \xEDndice gerado e hooks para o Claude Code.",
  private: true,
  type: "module",
  engines: {
    node: ">=20"
  },
  bin: {
    builderdev: "dist/cli.js"
  },
  scripts: {
    typecheck: "tsc --noEmit && tsc --noEmit -p src/dashboard/ui",
    test: "vitest run",
    build: "node scripts/build.mjs"
  },
  dependencies: {
    yaml: "^2.9.1"
  },
  devDependencies: {
    "@types/node": "^20.19.43",
    esbuild: "^0.28.2",
    typescript: "^7.0.2",
    vitest: "^5.0.2"
  }
};

// src/commit-msg.ts
import { existsSync as existsSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join3, resolve as resolve2 } from "node:path";

// src/git/log.ts
import { execFile, execFileSync } from "node:child_process";
var TRAILER_KEY = "Plan-Step";
var GitError = class extends Error {
  constructor(message, args) {
    super(message);
    this.args = args;
    this.name = "GitError";
  }
  args;
};
function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (err) {
    throw new GitError(`git ${args[0]}: ${gitReason(err)}`, args);
  }
}
var GIT_ASYNC_TIMEOUT_MS = 1e4;
function gitAsync(args, cwd, env) {
  return new Promise((resolve11, reject) => {
    execFile(
      "git",
      args,
      {
        cwd,
        encoding: "utf8",
        timeout: GIT_ASYNC_TIMEOUT_MS,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        env: env && { ...process.env, ...env }
      },
      (err, stdout, stderr) => {
        if (!err) return resolve11(stdout);
        const reason = err.killed ? `tempo esgotado (${GIT_ASYNC_TIMEOUT_MS / 1e3} s)` : gitReason({ stderr, message: err.message });
        reject(new GitError(`git ${args[0]}: ${reason}`, args));
      }
    );
  });
}
function gitReason(err) {
  const stderr = String(err.stderr ?? "").trim();
  return stderr.split(/\r?\n/)[0]?.replace(/^fatal: /, "") || err.message;
}
function hasCommits(cwd) {
  try {
    git(["rev-parse", "--verify", "--quiet", "HEAD"], cwd);
    return true;
  } catch {
    return false;
  }
}
var LOG_FORMAT = `--format=%H%x1f%(trailers:key=${TRAILER_KEY},valueonly,separator=%x1e)%x1e`;
function readPlanSteps(cwd, { all = false } = {}) {
  const steps = /* @__PURE__ */ new Map();
  if (!all && !hasCommits(cwd)) return steps;
  const args = ["log", LOG_FORMAT, "--regexp-ignore-case", `--grep=${TRAILER_KEY}`];
  if (all) args.push("--all");
  for (const record of git(args, cwd).split("\n")) {
    const sep6 = record.indexOf("");
    if (sep6 < 0) continue;
    const hash = record.slice(0, sep6).trim();
    for (const value of record.slice(sep6 + 1).split("")) {
      const ref = value.replace(/\s+/g, " ").trim();
      if (!ref) continue;
      const commits = steps.get(ref) ?? [];
      if (!commits.includes(hash)) commits.push(hash);
      steps.set(ref, commits);
    }
  }
  return steps;
}

// src/plan/find.ts
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

// src/plan/parse.ts
var import_yaml = __toESM(require_dist(), 1);
import { readFileSync } from "node:fs";
var PlanParseError = class extends Error {
  constructor(message, line) {
    super(message);
    this.line = line;
    this.name = "PlanParseError";
  }
  line;
};
var HEADING = /^ {0,3}(#{1,4})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
var FENCE = /^ {0,3}(`{3,}|~{3,})/;
var PHASE_TITLE = /^(f\d+)\s+·\s+(.+)$/;
function readPlan(path) {
  return parsePlan(readFileSync(path, "utf8"));
}
function parsePlan(source) {
  const lines = source.replace(/^﻿/, "").split(/\r?\n/);
  const { frontmatter, frontmatterLines, phases, closeIndex } = parseFrontmatter(lines);
  const bodyStartLine = closeIndex + 2;
  const headings = findHeadings(lines, closeIndex + 1);
  const sections = buildSections(headings, lines);
  return {
    lines,
    frontmatter,
    frontmatterLines,
    bodyStartLine,
    phases,
    headings,
    sections,
    bodyPhases: findBodyPhases(sections)
  };
}
function flattenSections(sections) {
  return sections.flatMap((s) => [s, ...flattenSections(s.children)]);
}
function parseFrontmatter(lines) {
  if (lines[0]?.trim() !== "---") {
    throw new PlanParseError("frontmatter ausente: o plano deve come\xE7ar com uma linha '---' seguida do YAML", 1);
  }
  const closeIndex = lines.findIndex((l, i) => i > 0 && (l.trim() === "---" || l.trim() === "..."));
  if (closeIndex < 0) {
    throw new PlanParseError("frontmatter sem fechamento: falta a linha '---' que encerra o YAML", 1);
  }
  const lineCounter = new import_yaml.LineCounter();
  const doc = (0, import_yaml.parseDocument)(lines.slice(1, closeIndex).join("\n"), { lineCounter });
  const fileLine = (offset) => lineCounter.linePos(offset).line + 1;
  const firstError = doc.errors[0];
  if (firstError) {
    const reason = (firstError.message.split("\n")[0] ?? "").replace(/ at line \d+, column \d+:?$/, "");
    throw new PlanParseError(`frontmatter inv\xE1lido: ${reason}`, fileLine(firstError.pos[0]));
  }
  if (!(0, import_yaml.isMap)(doc.contents)) {
    throw new PlanParseError("frontmatter inv\xE1lido: o YAML deve ser um mapeamento (chave: valor)", 2);
  }
  const frontmatter = doc.toJS();
  const frontmatterLines = keyLines(doc.contents.items, fileLine);
  const phasesNode = doc.get("phases", true);
  const phases = (0, import_yaml.isSeq)(phasesNode) ? phasesNode.items.map((item) => toYamlPhase(item, fileLine)) : [];
  return { frontmatter, frontmatterLines, phases, closeIndex };
}
function toYamlPhase(node, fileLine) {
  const line = node.range ? fileLine(node.range[0]) : 0;
  if (!(0, import_yaml.isMap)(node)) return { line, data: {}, isMapping: false, fieldLines: {} };
  return {
    line,
    data: node.toJSON(),
    isMapping: true,
    fieldLines: keyLines(node.items, fileLine)
  };
}
function keyLines(pairs, fileLine) {
  const out = {};
  for (const { key } of pairs) {
    if ((0, import_yaml.isScalar)(key) && key.range) out[String(key.value)] = fileLine(key.range[0]);
  }
  return out;
}
function findHeadings(lines, startIndex) {
  const headings = [];
  let fence = null;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      if (fenceMatch?.[1] && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && line.trim() === fenceMatch[1]) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      continue;
    }
    const m = HEADING.exec(line);
    if (m?.[1]) headings.push({ level: m[1].length, text: (m[2] ?? "").trim(), line: i + 1 });
  }
  return headings;
}
function buildSections(headings, lines) {
  const roots = [];
  const stack = [];
  headings.forEach((h, i) => {
    const next = headings.slice(i + 1).find((o) => o.level <= h.level);
    let endLine = next ? next.line - 1 : lines.length;
    while (endLine > h.line && (lines[endLine - 1] ?? "").trim() === "") endLine--;
    const section = { level: h.level, title: h.text, line: h.line, endLine, children: [] };
    while (stack.length && (stack[stack.length - 1]?.level ?? 0) >= h.level) stack.pop();
    const parent = stack[stack.length - 1];
    (parent ? parent.children : roots).push(section);
    stack.push(section);
  });
  return roots;
}
function findBodyPhases(sections) {
  const phases = [];
  for (const s of flattenSections(sections)) {
    if (s.level !== 2) continue;
    const m = PHASE_TITLE.exec(s.title);
    if (m?.[1] && m[2]) {
      phases.push({ id: m[1], title: m[2].trim(), line: s.line, endLine: s.endLine, sections: s.children });
    }
  }
  return phases;
}

// src/plan/find.ts
var ProjectError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProjectError";
  }
};
var PLANS_DIR = ".dev/plans";
function findProjectRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (; ; ) {
    if (isDir(join(dir, ".dev"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}
function listPlans(root) {
  const dir = join(root, PLANS_DIR);
  if (!isDir(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => loadPlan(root, join(dir, f)));
}
function loadPlan(root, file) {
  const path = relative(root, file).split(sep).join("/");
  const fallbackId = basename(file, ".md");
  try {
    const plan = readPlan(file);
    const id = typeof plan.frontmatter.id === "string" && plan.frontmatter.id.trim() ? plan.frontmatter.id.trim() : fallbackId;
    return { id, path, plan };
  } catch (err) {
    if (err instanceof PlanParseError) return { id: fallbackId, path, error: `${path}:${err.line}: ${err.message}` };
    throw err;
  }
}
function findPlan(root, id, plans = listPlans(root)) {
  const entry = plans.find((p) => p.id === id);
  if (entry?.plan) return entry;
  if (entry?.error) throw new ProjectError(`o plano "${id}" n\xE3o p\xF4de ser lido: ${entry.error}`);
  const known = plans.map((p) => p.id);
  const existing = known.length ? `existentes: ${known.join(", ")}` : "a pasta n\xE3o tem planos";
  throw new ProjectError(`plano "${id}" n\xE3o encontrado em ${PLANS_DIR}/ (${existing})`);
}
function planPhases(plan) {
  return plan.phases.filter((p) => p.isMapping && typeof p.data.id === "string").map((p) => ({
    id: p.data.id,
    title: typeof p.data.title === "string" ? p.data.title.trim() : "",
    yaml: p
  }));
}
function findPhase(entry, phaseId) {
  const phases = planPhases(entry.plan);
  const phase = phases.find((p) => p.id === phaseId);
  if (!phase) {
    throw new ProjectError(`fase "${phaseId}" n\xE3o existe no plano ${entry.id} (fases: ${phases.map((p) => p.id).join(", ")})`);
  }
  return phase;
}
function parsePhaseRef(ref) {
  const at = ref.lastIndexOf("/");
  const plan = ref.slice(0, at).trim();
  const phase = ref.slice(at + 1).trim();
  if (at < 0 || !plan || !phase) throw new ProjectError(`"${ref}" n\xE3o est\xE1 no formato <plano>/<fase>, ex.: v1-nucleo/f2`);
  return { plan, phase };
}
function isDir(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

// src/state.ts
import { existsSync as existsSync2, mkdirSync, readFileSync as readFileSync2, rmSync, writeFileSync } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";

// src/plan/status.ts
var STATUS_LABEL = {
  concluida: "conclu\xEDda",
  ativa: "ativa",
  bloqueada: "bloqueada",
  pendente: "pendente"
};
function planStatus(entry, steps, active) {
  const title = typeof entry.plan?.frontmatter.title === "string" ? entry.plan.frontmatter.title.trim() : "";
  if (!entry.plan) return { id: entry.id, title, path: entry.path, phases: [], error: entry.error };
  const phases = planPhases(entry.plan);
  const commitsOf = (phaseId) => steps.get(`${entry.id}/${phaseId}`) ?? [];
  return {
    id: entry.id,
    title,
    path: entry.path,
    phases: phases.map((phase, index) => {
      const declared = phase.yaml.data.needs;
      const needs = Array.isArray(declared) ? declared.filter((n) => typeof n === "string") : null;
      const previous = phases[index - 1];
      const dependsOn = needs ?? (previous ? [previous.id] : []);
      const blockedBy = dependsOn.filter((dep) => commitsOf(dep).length === 0);
      const commits = commitsOf(phase.id);
      const isActive = active?.plan === entry.id && active.phase === phase.id;
      const status = commits.length ? "concluida" : isActive ? "ativa" : blockedBy.length ? "bloqueada" : "pendente";
      return { id: phase.id, title: phase.title, status, needs, dependsOn, blockedBy, commits };
    })
  };
}
function formatPlanStatus(status) {
  const header = status.title ? `${status.id} \xB7 ${status.title}` : status.id;
  if (status.error) return `${header}
  erro: ${status.error}`;
  if (!status.phases.length) return `${header}
  (nenhuma fase no YAML)`;
  const idWidth = Math.max(...status.phases.map((p) => p.id.length));
  const statusWidth = Math.max(...status.phases.map((p) => STATUS_LABEL[p.status].length));
  const titleWidth = Math.max(...status.phases.map((p) => p.title.length));
  const rows = status.phases.map((p) => {
    const detail = phaseDetail(p);
    const cells = [p.id.padEnd(idWidth), STATUS_LABEL[p.status].padEnd(statusWidth), detail ? p.title.padEnd(titleWidth) : p.title];
    if (detail) cells.push(detail);
    return `  ${cells.join("  ")}`;
  });
  return [header, ...rows].join("\n");
}
function phaseDetail(p) {
  if (p.commits.length) {
    const more = p.commits.length > 1 ? ` +${p.commits.length - 1}` : "";
    return `${p.commits[0].slice(0, 7)}${more}`;
  }
  return p.blockedBy.length ? `aguarda ${p.blockedBy.join(", ")}` : "";
}

// src/state.ts
var STATE_FILE = ".dev/.local/state.json";
function readState(root) {
  const file = join2(root, STATE_FILE);
  if (!existsSync2(file)) return null;
  try {
    const data = JSON.parse(readFileSync2(file, "utf8"));
    if (typeof data.plan !== "string" || typeof data.phase !== "string") return null;
    return { plan: data.plan, phase: data.phase, startedAt: typeof data.startedAt === "string" ? data.startedAt : "" };
  } catch {
    return null;
  }
}
function writeState(root, state) {
  const file = join2(root, STATE_FILE);
  mkdirSync(dirname2(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}
`);
}
function clearState(root) {
  const previous = readState(root);
  rmSync(join2(root, STATE_FILE), { force: true });
  return previous;
}
function startPhase(root, ref, { force = false, now = /* @__PURE__ */ new Date() } = {}) {
  const { plan: planId, phase: phaseId } = parsePhaseRef(ref);
  const entry = findPlan(root, planId);
  const phase = findPhase(entry, phaseId);
  const status = planStatus(entry, readPlanSteps(root), null).phases.find((p) => p.id === phase.id);
  const warnings = [];
  if (status.status === "concluida") {
    warnings.push(`${ref} j\xE1 est\xE1 conclu\xEDda (${status.commits[0].slice(0, 7)}); os pr\xF3ximos commits tamb\xE9m recebem o trailer`);
  } else if (status.blockedBy.length) {
    const reason = `${ref} est\xE1 bloqueada: aguarda ${status.blockedBy.join(", ")}`;
    if (!force) throw new ProjectError(`${reason} (use --force para ativar mesmo assim)`);
    warnings.push(reason);
  }
  const previous = readState(root);
  const state = { plan: entry.id, phase: phase.id, startedAt: now.toISOString() };
  writeState(root, state);
  return { state, title: phase.title, previous, warnings };
}

// src/commit-msg.ts
var REPLAY_STATE = ["rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD", "REVERT_HEAD"];
function prepareCommitMsg(file, source, cwd = process.cwd()) {
  if (source === "merge" || source === "squash") return { action: "ignorado", reason: source };
  const root = findProjectRoot(cwd);
  const state = readState(root);
  if (!state) return { action: "ignorado", reason: "nenhuma fase ativa" };
  const gitDir = git(["rev-parse", "--absolute-git-dir"], cwd).trim();
  const replay = REPLAY_STATE.find((name) => existsSync3(join3(gitDir, name)));
  if (replay) return { action: "ignorado", reason: replay };
  const entry = findPlan(root, state.plan);
  const phase = findPhase(entry, state.phase);
  const path = resolve2(cwd, file);
  const original = readFileSync3(path, "utf8");
  let filled = false;
  const commitMsg = phase.yaml.data.commit_msg;
  if (typeof commitMsg === "string" && commitMsg.trim() && isEmptyMessage(original, commentPrefix(cwd))) {
    const rest = original.startsWith("\n") || original === "" ? original : `
${original}`;
    writeFileSync2(path, `${commitMsg.trim()}
${rest}`);
    filled = true;
  }
  git(["interpret-trailers", "--in-place", "--if-exists", "doNothing", "--trailer", `${TRAILER_KEY}: ${entry.id}/${phase.id}`, path], cwd);
  if (filled) return { action: "preenchido" };
  return readFileSync3(path, "utf8") === original ? { action: "inalterado" } : { action: "trailer" };
}
function isEmptyMessage(text, comment) {
  const lines = text.split(/\r?\n/);
  const scissors = lines.findIndex((line) => line === `${comment} ------------------------ >8 ------------------------`);
  return lines.slice(0, scissors < 0 ? void 0 : scissors).every((line) => line.trim() === "" || line.startsWith(comment));
}
function commentPrefix(cwd) {
  for (const key of ["core.commentString", "core.commentChar"]) {
    try {
      const value = git(["config", "--get", key], cwd).replace(/\r?\n$/, "");
      if (value && value !== "auto") return value;
    } catch {
    }
  }
  return "#";
}

// src/dashboard/server.ts
import { readFile, stat as stat2 } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join as join6, relative as relative2, resolve as resolve4 } from "node:path";

// src/dashboard/scan.ts
import { existsSync as existsSync4 } from "node:fs";
import { readdir } from "node:fs/promises";
import { join as join5, resolve as resolve3 } from "node:path";

// src/dashboard/alerts.ts
var MINUTE_MS = 6e4;
var DAY_MS = 24 * 60 * MINUTE_MS;
var STALE_CHANGES_MS = 2 * DAY_MS;
var IDLE_MS = 30 * DAY_MS;
function alertsFor(project, now) {
  const alerts = [];
  const age = (iso) => iso === null ? null : now.getTime() - Date.parse(iso);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  if (project.kind === "sem-git") {
    alerts.push({ code: "sem-git", severity: "info", message: "pasta sem git" });
  }
  const git2 = project.git;
  if (git2) {
    const oldest = age(git2.changes.oldestMtime);
    if (oldest !== null && oldest > STALE_CHANGES_MS) {
      alerts.push({ code: "mudancas-paradas", severity: "atencao", message: `mudan\xE7as sem commit h\xE1 ${formatAge(oldest)}` });
    }
    if (git2.behind !== null && git2.behind > 0) {
      alerts.push({ code: "atras-do-remoto", severity: "atencao", message: `${plural(git2.behind, "commit", "commits")} atr\xE1s do remoto` });
    }
    if (git2.ahead !== null && git2.ahead > 0) {
      alerts.push({ code: "sem-push", severity: "info", message: `${plural(git2.ahead, "commit", "commits")} sem push` });
    }
  }
  const idle = age(project.lastActivity);
  if (idle !== null && idle > IDLE_MS) {
    alerts.push({ code: "parado", severity: "info", message: `sem atividade h\xE1 ${formatAge(idle)}` });
  }
  return alerts.sort((a, b) => Number(b.severity === "atencao") - Number(a.severity === "atencao"));
}
function formatAge(ms) {
  if (ms < 60 * MINUTE_MS) return `${Math.max(1, Math.floor(ms / MINUTE_MS))} min`;
  if (ms < DAY_MS) return `${Math.floor(ms / (60 * MINUTE_MS))} h`;
  const days = Math.floor(ms / DAY_MS);
  if (days < 60) return `${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} meses`;
  return `${Math.floor(days / 365)} anos`;
}

// src/dashboard/git-info.ts
import { stat } from "node:fs/promises";
import { dirname as dirname3, join as join4 } from "node:path";
var MAX_STAT_PATHS = 200;
async function gitInfo(dir) {
  const run = (args) => gitAsync(args, dir, { GIT_CEILING_DIRECTORIES: dirname3(dir) });
  const head = await run(["rev-parse", "--verify", "-q", "HEAD"]).then(
    (out) => out.trim() || null,
    async () => {
      await run(["rev-parse", "--git-dir"]);
      return null;
    }
  );
  const [branchRef, lastCommit, changes, upstream, recent] = await Promise.all([
    head ? run(["rev-parse", "--abbrev-ref", "HEAD"]) : run(["symbolic-ref", "--short", "HEAD"]),
    head ? run(["log", "-1", "--format=%h%x1f%s%x1f%cI%x1f%an"]).then(parseLastCommit) : null,
    run(["status", "--porcelain=v1", "-z"]).then((out) => readChanges(dir, out)),
    head ? run(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).then(parseAheadBehind, () => null) : null,
    head ? run(["rev-list", "--count", "--since=7.days", "HEAD"]).then((out) => Number(out.trim()) || 0) : 0
  ]);
  const name = branchRef.trim();
  const detached = name === "HEAD";
  return {
    branch: detached ? head.slice(0, 7) : name,
    detached,
    lastCommit,
    changes,
    behind: upstream?.behind ?? null,
    ahead: upstream?.ahead ?? null,
    commitsLast7Days: recent,
    lastActivity: latest([lastCommit?.date ?? null, changes.newestMtime])
  };
}
function parseLastCommit(out) {
  const [hash, subject, date, author] = out.trim().split("");
  if (!hash || date === void 0) return null;
  return { hash, subject: (subject ?? "").trim(), date: new Date(date).toISOString(), author: author ?? "" };
}
function parseAheadBehind(out) {
  const [behind, ahead] = out.trim().split(/\s+/).map(Number);
  return behind === void 0 || ahead === void 0 || Number.isNaN(behind) || Number.isNaN(ahead) ? null : { behind, ahead };
}
async function readChanges(dir, out) {
  const tokens = out.split("\0");
  const paths = [];
  let modified = 0;
  let untracked = 0;
  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i];
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    if (code === "!!") continue;
    if (code === "??") untracked++;
    else modified++;
    paths.push(entry.slice(3));
    if (code.includes("R") || code.includes("C")) i++;
  }
  const times = await Promise.all(paths.slice(0, MAX_STAT_PATHS).map((p) => mtimeOf(join4(dir, p))));
  const valid = times.filter((t) => t !== null);
  const iso = (t) => t === void 0 ? null : new Date(t).toISOString();
  return {
    modified,
    untracked,
    oldestMtime: iso(valid.length ? Math.min(...valid) : void 0),
    newestMtime: iso(valid.length ? Math.max(...valid) : void 0)
  };
}
async function mtimeOf(path) {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}
function latest(dates) {
  const times = dates.filter((d) => d !== null).map((d) => Date.parse(d));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

// src/dashboard/scan.ts
var SCAN_CONCURRENCY = 4;
async function scanRoot(root, now = () => /* @__PURE__ */ new Date()) {
  const started = performance.now();
  const abs = resolve3(root);
  const dirs = (await readdir(abs, { withFileTypes: true })).filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules").map((d) => d.name).sort((a, b) => a.localeCompare(b));
  const at = now();
  const projects = await mapLimit(dirs, SCAN_CONCURRENCY, (name) => readProject(join5(abs, name), name, at));
  return {
    root: abs,
    scannedAt: at.toISOString(),
    durationMs: Math.round(performance.now() - started),
    projects: projects.sort(byAttention)
  };
}
function classify(dir) {
  if (!existsSync4(join5(dir, ".git"))) return "sem-git";
  return existsSync4(join5(dir, ".dev", "plans")) ? "builderdev" : "git";
}
async function readProject(path, name, now) {
  const kind = classify(path);
  const base = { name, path, kind };
  try {
    const git2 = kind === "sem-git" ? null : await gitInfo(path);
    const lastActivity = git2 ? git2.lastActivity : await newestEntry(path);
    return { ...base, git: git2, lastActivity, alerts: alertsFor({ kind, git: git2, lastActivity }, now), error: null };
  } catch (err) {
    return { ...base, git: null, lastActivity: null, alerts: [], error: err.message };
  }
}
async function newestEntry(dir) {
  const names = await readdir(dir);
  const times = await Promise.all([dir, ...names.map((n) => join5(dir, n))].map(mtimeOf));
  return latest(times.map((t) => t === null ? null : new Date(t).toISOString()));
}
function byAttention(a, b) {
  const attention = (p) => Number(p.alerts.some((x) => x.severity === "atencao"));
  const time = (p) => p.lastActivity ? Date.parse(p.lastActivity) : 0;
  return attention(b) - attention(a) || time(b) - time(a) || a.name.localeCompare(b.name);
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// src/dashboard/server.ts
var DEFAULT_PORT = 4317;
var HOST = "127.0.0.1";
var CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};
async function startServer({ root, port, uiDir }) {
  const ui = resolve4(uiDir);
  let pending = null;
  const scan = () => {
    pending ??= scanRoot(root).finally(() => {
      pending = null;
    });
    return pending;
  };
  let actualPort = port;
  const server = createServer((req, res) => {
    handle(req, res, { port: actualPort, ui, scan }).catch((err) => {
      send(res, 500, "text/plain; charset=utf-8", `erro interno: ${err.message}`);
    });
  });
  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, HOST, () => {
      server.off("error", fail);
      done();
    });
  });
  actualPort = server.address().port;
  return {
    url: `http://${HOST}:${actualPort}`,
    port: actualPort,
    server,
    scan,
    close: () => new Promise((done) => {
      server.close(() => done());
      server.closeAllConnections();
    })
  };
}
async function handle(req, res, ctx) {
  const allowed = [`${HOST}:${ctx.port}`, `localhost:${ctx.port}`];
  if (!allowed.includes((req.headers.host ?? "").toLowerCase())) {
    return send(res, 403, "text/plain; charset=utf-8", "host n\xE3o permitido");
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, "text/plain; charset=utf-8", "s\xF3 GET");
  }
  const pathname = new URL(req.url ?? "/", `http://${HOST}`).pathname;
  if (pathname === "/api/projects") {
    return send(res, 200, CONTENT_TYPES[".json"], JSON.stringify(await ctx.scan()));
  }
  if (pathname.startsWith("/api/")) {
    return send(res, 404, CONTENT_TYPES[".json"], JSON.stringify({ error: "rota desconhecida" }));
  }
  const file = await staticFile(ctx.ui, pathname) ?? join6(ctx.ui, "index.html");
  const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  try {
    send(res, 200, type, await readFile(file));
  } catch {
    send(res, 404, "text/plain; charset=utf-8", "UI n\xE3o encontrada: rode npm run build");
  }
}
async function staticFile(ui, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const file = resolve4(ui, `.${decoded}`);
  const rel = relative2(ui, file);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
  try {
    return (await stat2(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}
function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'"
  });
  res.end(body);
}

// src/git/hooks-install.ts
import { chmodSync, copyFileSync, existsSync as existsSync5, mkdirSync as mkdirSync2, readFileSync as readFileSync4, rmSync as rmSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join7, relative as relative3, resolve as resolve5, sep as sep2 } from "node:path";
var HOOK_NAME = "prepare-commit-msg";
var BEGIN = "# builderdev:inicio";
var END = "# builderdev:fim";
var SHEBANG = "#!/bin/sh";
var HOOK_BLOCK = [
  `${BEGIN} \xB7 gerado por "builderdev hooks install"; remova com "builderdev hooks uninstall"`,
  "builderdev_status=$?",
  "if command -v builderdev >/dev/null 2>&1; then",
  '  builderdev commit-msg "$1" "$2" || true',
  "fi",
  '(exit "$builderdev_status")',
  END
].join("\n");
function hooksDir(cwd) {
  return resolve5(cwd, git(["rev-parse", "--git-path", "hooks"], cwd).trim());
}
function installHook(cwd) {
  const dir = hooksDir(cwd);
  const file = join7(dir, HOOK_NAME);
  const path = display(cwd, file);
  if (!existsSync5(file)) {
    mkdirSync2(dir, { recursive: true });
    writeFileSync3(file, `${SHEBANG}
${HOOK_BLOCK}
`);
    chmodSync(file, 493);
    return { action: "criado", path };
  }
  const current = readFileSync4(file, "utf8");
  const block = findBlock(current);
  if (block) {
    const updated = `${current.slice(0, block.start)}${HOOK_BLOCK}${current.slice(block.end)}`;
    if (updated === current) return { action: "inalterado", path };
    writeFileSync3(file, updated);
    return { action: "atualizado", path };
  }
  const backup = `${file}.bak`;
  copyFileSync(file, backup);
  const separator = current.endsWith("\n") ? "\n" : "\n\n";
  writeFileSync3(file, `${current}${separator}${HOOK_BLOCK}
`);
  return { action: "acrescentado", path, backup: display(cwd, backup) };
}
function uninstallHook(cwd) {
  const file = join7(hooksDir(cwd), HOOK_NAME);
  const path = display(cwd, file);
  if (!existsSync5(file)) return { action: "ausente", path };
  const current = readFileSync4(file, "utf8");
  const block = findBlock(current);
  if (!block) return { action: "ausente", path };
  let before = current.slice(0, block.start);
  if (before.endsWith("\n\n")) before = before.slice(0, -1);
  const after = current.slice(block.end).replace(/^\r?\n/, "");
  const rest = before + after;
  const backup = `${file}.bak`;
  if (existsSync5(backup)) {
    const original = readFileSync4(backup, "utf8");
    if (rest === original || rest === `${original}
`) {
      writeFileSync3(file, original);
      rmSync2(backup);
      return { action: "restaurado", path };
    }
  }
  if (rest.trim() === "" || rest.trim() === SHEBANG) {
    rmSync2(file);
    return { action: "removido", path };
  }
  writeFileSync3(file, rest);
  return { action: "bloco removido", path };
}
function findBlock(text) {
  const begin = new RegExp(`^${BEGIN}.*$`, "m").exec(text);
  if (!begin) return null;
  const endMatch = new RegExp(`^${END}[ \\t]*\\r?$`, "m").exec(text.slice(begin.index));
  const end = endMatch ? begin.index + endMatch.index + endMatch[0].replace(/\r$/, "").length : text.replace(/\s+$/, "").length;
  return { start: begin.index, end };
}
function display(cwd, file) {
  return relative3(cwd, file).split(sep2).join("/");
}

// src/hooks/common.ts
import { appendFileSync, existsSync as existsSync6, mkdirSync as mkdirSync3, statSync as statSync2 } from "node:fs";
import { dirname as dirname4, join as join8 } from "node:path";
var METRICS_FILE = ".dev/.local/metrics.jsonl";
function parseHookInput(text) {
  const json = text.replace(/^﻿/, "");
  if (!json.trim()) return {};
  try {
    const data = JSON.parse(json);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}
function hookProjectRoot(input, env = process.env) {
  const start = input.cwd || env.CLAUDE_PROJECT_DIR || process.cwd();
  const root = findProjectRoot(start);
  const dev = join8(root, ".dev");
  return existsSync6(dev) && statSync2(dev).isDirectory() ? root : null;
}
function textList(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  return Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim() !== "").map((v) => v.trim()) : [];
}
function appendMetric(root, record, now = /* @__PURE__ */ new Date()) {
  const file = join8(root, METRICS_FILE);
  mkdirSync3(dirname4(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ ...record, ts: now.toISOString() })}
`);
}

// src/hooks/post-compact.ts
function postCompact(root, input, now = /* @__PURE__ */ new Date()) {
  const trigger = input.trigger ?? input.hookSpecificOutput?.trigger ?? null;
  appendMetric(root, { evento: "compact", trigger, session_id: input.session_id ?? null }, now);
}

// src/hooks/session-start.ts
import { existsSync as existsSync9, readFileSync as readFileSync7 } from "node:fs";
import { join as join11 } from "node:path";

// src/memory/reindex.ts
import { existsSync as existsSync8, readFileSync as readFileSync6, statSync as statSync4, writeFileSync as writeFileSync4 } from "node:fs";
import { join as join10 } from "node:path";

// src/memory/schema.ts
var import_yaml2 = __toESM(require_dist(), 1);
import { existsSync as existsSync7, readFileSync as readFileSync5, readdirSync as readdirSync2, statSync as statSync3 } from "node:fs";
import { basename as basename2, join as join9 } from "node:path";
var TRACKS = ["conhecimento", "bug"];
var TYPES = {
  conhecimento: ["convencao", "decisao", "padrao", "ferramenta", "fluxo", "pratica"],
  bug: ["build", "teste", "runtime", "performance", "dados", "seguranca", "ui", "integracao", "logica"]
};
var TRACK_DIRS = { conhecimento: ".dev/memory", bug: ".dev/errors" };
var INDEX_FILE = "index.md";
var SUMMARY_MAX = 120;
var TAGS_MAX = 8;
var APPLIES_WHEN_MAX = 5;
var SYMPTOMS_MAX = 5;
var COMMON_FIELDS = ["track", "type", "module", "summary", "tags", "created", "updated", "applies_when"];
var BUG_FIELDS = ["symptoms", "root_cause", "resolution", "occurrences"];
var TAG = /^[\p{Ll}\d]+(?:-[\p{Ll}\d]+)*$/u;
var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var SLUG_DATE = /(?:^|-)(?:\d{4}-\d{2}(?:-\d{2})?|\d{8})(?:-|$)/;
var DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
var H1 = /^ {0,3}#[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
var FENCE2 = /^ {0,3}(`{3,}|~{3,})/;
var EntryParseError = class extends Error {
  constructor(message, line) {
    super(message);
    this.line = line;
    this.name = "EntryParseError";
  }
  line;
};
function readEntry(path) {
  return parseEntry(readFileSync5(path, "utf8"), path);
}
function parseEntry(source, path) {
  const lines = source.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    throw new EntryParseError("frontmatter ausente: a entrada deve come\xE7ar com uma linha '---' seguida do YAML", 1);
  }
  const closeIndex = lines.findIndex((l, i) => i > 0 && (l.trim() === "---" || l.trim() === "..."));
  if (closeIndex < 0) throw new EntryParseError("frontmatter sem fechamento: falta a linha '---' que encerra o YAML", 1);
  const lineCounter = new import_yaml2.LineCounter();
  const doc = (0, import_yaml2.parseDocument)(lines.slice(1, closeIndex).join("\n"), { lineCounter });
  const fileLine = (offset) => lineCounter.linePos(offset).line + 1;
  const firstError = doc.errors[0];
  if (firstError) {
    const reason = (firstError.message.split("\n")[0] ?? "").replace(/ at line \d+, column \d+:?$/, "");
    throw new EntryParseError(`frontmatter inv\xE1lido: ${reason}`, fileLine(firstError.pos[0]));
  }
  if (!(0, import_yaml2.isMap)(doc.contents)) throw new EntryParseError("frontmatter inv\xE1lido: o YAML deve ser um mapeamento (chave: valor)", 2);
  const fieldLines = {};
  for (const { key } of doc.contents.items) {
    if ((0, import_yaml2.isScalar)(key) && key.range) fieldLines[String(key.value)] = fileLine(key.range[0]);
  }
  const slug = basename2(path).replace(/\.md$/, "");
  return {
    path,
    slug,
    lines,
    frontmatter: doc.toJS() ?? {},
    fieldLines,
    bodyStartLine: closeIndex + 2,
    title: findTitle(lines, closeIndex + 1) ?? slug
  };
}
function findTitle(lines, startIndex) {
  let fence = null;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const fenceMatch = FENCE2.exec(line);
    if (fence) {
      if (fenceMatch?.[1] && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      continue;
    }
    const m = H1.exec(line);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}
function bodyLines(entry) {
  const body = entry.lines.slice(entry.bodyStartLine - 1);
  let start = 0;
  let end = body.length;
  while (start < end && body[start].trim() === "") start++;
  while (end > start && body[end - 1].trim() === "") end--;
  return body.slice(start, end);
}
function entryFields(entry) {
  const fm = entry.frontmatter;
  const text = (v) => typeof v === "string" || typeof v === "number" ? String(v).replace(/\s+/g, " ").trim() : "";
  const list = (v) => Array.isArray(v) ? v.map(text).filter(Boolean) : [];
  return {
    track: text(fm.track),
    type: text(fm.type),
    module: text(fm.module),
    summary: text(fm.summary),
    tags: list(fm.tags),
    appliesWhen: list(fm.applies_when),
    symptoms: list(fm.symptoms)
  };
}
function listEntryFiles(dir) {
  if (!existsSync7(dir) || !statSync3(dir).isDirectory()) return [];
  return readdirSync2(dir).filter((f) => f.endsWith(".md") && f !== INDEX_FILE).sort().map((f) => join9(dir, f));
}
function slugProblems(slug) {
  if (!SLUG.test(slug)) return [`"${slug}" n\xE3o \xE9 um slug: use min\xFAsculas sem acento, n\xFAmeros e h\xEDfen (ex.: viewshed-crs-metrico)`];
  if (SLUG_DATE.test(slug)) return [`"${slug}" tem data no nome: o slug descreve o assunto, e a data fica em "created"`];
  return [];
}
function validateEntry(entry) {
  const problems = [];
  const fm = entry.frontmatter;
  const at = (field) => entry.fieldLines[field] ?? 1;
  const error = (field, code, message) => problems.push({ line: at(field), severity: "erro", code, message });
  const warn = (field, code, message) => problems.push({ line: at(field), severity: "aviso", code, message });
  const present = (field) => fm[field] !== void 0 && fm[field] !== null && fm[field] !== "";
  const track = fm.track;
  const isTrack = typeof track === "string" && TRACKS.includes(track);
  if (!present("track")) error("track", "field-missing", `campo "track" ausente: use ${TRACKS.join(" | ")}`);
  else if (!isTrack) error("track", "track-invalid", `track "${String(track)}" inv\xE1lida: use ${TRACKS.join(" | ")}`);
  if (!present("type")) {
    error("type", "field-missing", `campo "type" ausente${isTrack ? `: use ${TYPES[track].join(" | ")}` : ""}`);
  } else if (isTrack && !TYPES[track].includes(String(fm.type))) {
    error("type", "type-enum", `type "${String(fm.type)}" n\xE3o existe na trilha ${track}: use ${TYPES[track].join(" | ")}`);
  }
  for (const field of ["module", "summary"]) {
    if (!present(field)) error(field, "field-missing", `campo "${field}" ausente ou vazio`);
    else if (typeof fm[field] !== "string") error(field, "field-invalid", `"${field}" deve ser texto`);
  }
  if (typeof fm.summary === "string") {
    if (/\n/.test(fm.summary.trim())) error("summary", "summary-multiline", '"summary" deve ter uma linha s\xF3: ela vira a linha do \xEDndice');
    else if (fm.summary.trim().length > SUMMARY_MAX) {
      error("summary", "summary-too-long", `"summary" tem ${fm.summary.trim().length} caracteres (m\xE1ximo ${SUMMARY_MAX})`);
    }
  }
  checkList("tags", 1, TAGS_MAX, true);
  if (Array.isArray(fm.tags)) {
    for (const tag of fm.tags) {
      if (typeof tag === "string" && !TAG.test(tag)) error("tags", "tag-format", `tag "${tag}" fora do formato: min\xFAsculas e h\xEDfen (ex.: ui-web)`);
    }
  }
  if (present("applies_when")) checkList("applies_when", 0, APPLIES_WHEN_MAX, false);
  if (!present("created")) error("created", "field-missing", 'campo "created" ausente: use a data AAAA-MM-DD');
  for (const field of ["created", "updated"]) {
    if (present(field) && !isDate(fm[field])) error(field, "date-invalid", `"${field}" deve ser uma data AAAA-MM-DD, n\xE3o "${String(fm[field])}"`);
  }
  if (track === "bug") {
    checkList("symptoms", 1, SYMPTOMS_MAX, true);
    for (const field of ["root_cause", "resolution"]) {
      if (!present(field)) error(field, "field-missing", `campo "${field}" ausente ou vazio (obrigat\xF3rio na trilha bug)`);
      else if (typeof fm[field] !== "string") error(field, "field-invalid", `"${field}" deve ser texto`);
    }
    if (!present("occurrences")) error("occurrences", "field-missing", 'campo "occurrences" ausente (obrigat\xF3rio na trilha bug; come\xE7a em 1)');
    else if (!Number.isInteger(fm.occurrences) || fm.occurrences < 1) {
      error("occurrences", "occurrences-invalid", `"occurrences" deve ser um inteiro a partir de 1, n\xE3o "${String(fm.occurrences)}"`);
    }
  } else if (isTrack) {
    for (const field of BUG_FIELDS) {
      if (field in fm) warn(field, "field-wrong-track", `"${field}" s\xF3 vale na trilha bug; nesta trilha ele \xE9 ignorado`);
    }
  }
  const known = /* @__PURE__ */ new Set([...COMMON_FIELDS, ...BUG_FIELDS]);
  for (const field of Object.keys(fm)) {
    if (!known.has(field)) warn(field, "field-unknown", `campo "${field}" n\xE3o faz parte do schema e \xE9 ignorado`);
  }
  return problems;
  function checkList(field, min, max, required) {
    const value = fm[field];
    if (value === void 0 || value === null) {
      if (required) error(field, "field-missing", `campo "${field}" ausente: lista com ${min} a ${max} itens`);
      return;
    }
    if (!Array.isArray(value) || !value.every((v) => typeof v === "string" && v.trim() !== "")) {
      error(field, "field-invalid", `"${field}" deve ser uma lista de textos n\xE3o vazios`);
    } else if (value.length < min || value.length > max) {
      error(field, `${field.replace("_", "-")}-count`, `"${field}" tem ${value.length} ${value.length === 1 ? "item" : "itens"} (de ${min} a ${max})`);
    }
  }
}
function isDate(value) {
  const m = typeof value === "string" ? DATE.exec(value) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

// src/memory/reindex.ts
var INDEX_HEADER = "<!-- GERADO por builderdev reindex; n\xE3o editar -->";
var INDEX_MAX_LINES = 200;
var INDEX_TITLES = { conhecimento: "Mem\xF3ria", bug: "Erros" };
function indexLine(entry) {
  const f = entryFields(entry);
  const kind = `${f.track || "?"}/${f.type || "?"}`;
  return `- [${entry.slug}](${entry.slug}.md) \xB7 ${kind} \xB7 ${f.module || "?"} \xB7 ${f.tags.join(", ") || "?"} - ${f.summary || "?"}`;
}
function buildIndex(track, entries) {
  const key = (e) => {
    const module = entryFields(e).module;
    return [module.toLowerCase(), module, e.slug];
  };
  const sorted = [...entries].sort((a, b) => compareKeys(key(a), key(b)));
  const count = `${sorted.length} ${sorted.length === 1 ? "entrada" : "entradas"}`;
  return [INDEX_HEADER, `# ${INDEX_TITLES[track]} \xB7 ${count}`, "", ...sorted.map(indexLine), ""].join("\n");
}
function indexLineCount(content) {
  return content.endsWith("\n") ? content.split("\n").length - 1 : content.split("\n").length;
}
function loadTrack(root, track) {
  const entries = [];
  const skipped = [];
  for (const file of listEntryFiles(join10(root, TRACK_DIRS[track]))) {
    try {
      entries.push(readEntry(file));
    } catch (err) {
      if (!(err instanceof EntryParseError)) throw err;
      skipped.push({ path: file, line: err.line, message: err.message });
    }
  }
  return { entries, skipped };
}
function reindex(root) {
  const results = [];
  for (const track of TRACKS) {
    const dir = join10(root, TRACK_DIRS[track]);
    if (!existsSync8(dir) || !statSync4(dir).isDirectory()) continue;
    const { entries, skipped } = loadTrack(root, track);
    const content = buildIndex(track, entries);
    const file = join10(dir, INDEX_FILE);
    const changed = !existsSync8(file) || readFileSync6(file, "utf8") !== content;
    if (changed) writeFileSync4(file, content);
    const lines = indexLineCount(content);
    results.push({
      track,
      path: `${TRACK_DIRS[track]}/${INDEX_FILE}`,
      entries: entries.length,
      lines,
      changed,
      overBudget: lines > INDEX_MAX_LINES,
      skipped
    });
  }
  return results;
}
function compareKeys(a, b) {
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// src/hooks/session-start.ts
var CONTEXT_MAX = 8e3;
var DIFF_MAX_LINES = 10;
var INDEX_LABELS = { conhecimento: "Mem\xF3ria", bug: "Erros" };
function sessionStart(root, input, now = /* @__PURE__ */ new Date()) {
  try {
    reindex(root);
  } catch {
  }
  const context = buildContext(root);
  appendMetric(root, { evento: "session-start", source: input.source ?? null, caracteres: context.length, session_id: input.session_id ?? null }, now);
  return { context, output: { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } } };
}
function buildContext(root) {
  const head = [...phaseLines(root)];
  const commits = gitLines(root, ["log", "--oneline", "-5"]);
  if (commits.length) head.push("\xDAltimos commits:", ...commits.map((l) => `  ${l}`));
  const diff = diffStat(root);
  const diffBlock = diff.length ? { title: "Mudan\xE7as n\xE3o commitadas (git diff --stat):", lines: diff, shown: diff.length, source: "git diff --stat" } : null;
  const indexBlocks = TRACKS.flatMap((track) => {
    const block = indexBlock(root, track);
    return block ? [block] : [];
  });
  const blocks = [...diffBlock ? [diffBlock] : [], ...indexBlocks];
  const render = () => [...head, ...blocks.flatMap(renderBlock)].join("\n");
  const byLength = [...indexBlocks].sort((a, b) => renderBlock(b).join("\n").length - renderBlock(a).join("\n").length);
  for (const block of [...diffBlock ? [diffBlock] : [], ...byLength]) {
    while (block.shown > 0 && render().length > CONTEXT_MAX) block.shown--;
  }
  const text = render();
  if (text.length <= CONTEXT_MAX) return text;
  const marker = "\n[cortado: builderdev brief]";
  return text.slice(0, CONTEXT_MAX - marker.length) + marker;
}
function renderBlock(block) {
  const hidden = block.lines.length - block.shown;
  return [block.title, ...block.lines.slice(0, block.shown), ...hidden > 0 ? [`  [+${hidden} linhas: ${block.source}]`] : []];
}
function phaseLines(root) {
  const branch = currentBranch(root);
  const prefix = `[builderdev] ${branch ? `branch ${branch} \xB7 ` : ""}`;
  const state = readState(root);
  if (!state) return [`${prefix}nenhuma fase ativa (planos: builderdev status)`];
  const ref = `${state.plan}/${state.phase}`;
  try {
    const entry = findPlan(root, state.plan);
    const phase = findPhase(entry, state.phase);
    const lines = [`${prefix}fase ativa ${ref} - ${phase.title}`];
    const objective = phaseObjective(entry.plan, phase.id);
    if (objective) lines.push(`Objetivo: ${objective}`);
    const files = textList(phase.yaml.data.files);
    if (files.length) lines.push(`Arquivos: ${files.join(", ")}`);
    const verify = textList(phase.yaml.data.verify);
    if (verify.length) lines.push(`Verifica\xE7\xE3o: ${verify.join(" \xB7 ")}`);
    lines.push("Detalhes da fase: builderdev brief");
    return lines;
  } catch (err) {
    return [`${prefix}fase ativa ${ref} n\xE3o p\xF4de ser lida: ${err.message} (builderdev stop limpa)`];
  }
}
function phaseObjective(plan, phaseId) {
  const body = plan.bodyPhases.find((b) => b.id === phaseId);
  const section = body?.sections.find((s) => s.level === 3 && s.title.trim().toLowerCase() === "objetivo");
  if (!section) return "";
  return plan.lines.slice(section.line, section.endLine).map((l) => l.trim()).filter(Boolean).join(" ");
}
function currentBranch(root) {
  const branch = gitLines(root, ["branch", "--show-current"])[0];
  if (branch) return branch;
  const head = gitLines(root, ["rev-parse", "--short", "HEAD"])[0];
  return head ? `(HEAD destacado em ${head})` : null;
}
function diffStat(root) {
  if (!hasCommits(root)) return [];
  const lines = gitLines(root, ["diff", "HEAD", "--stat=100", "--stat-graph-width=20"]);
  if (lines.length <= DIFF_MAX_LINES) return lines;
  return [...lines.slice(0, DIFF_MAX_LINES - 1), lines[lines.length - 1]];
}
function indexBlock(root, track) {
  const path = `${TRACK_DIRS[track]}/${INDEX_FILE}`;
  const file = join11(root, path);
  if (!existsSync9(file)) return null;
  const lines = readFileSync7(file, "utf8").split(/\r?\n/).filter((l) => l.startsWith("- "));
  const count = `${lines.length} ${lines.length === 1 ? "entrada" : "entradas"}`;
  return { title: `${INDEX_LABELS[track]} (${count}, ${path}):`, lines, shown: lines.length, source: "builderdev reindex" };
}
function gitLines(root, args) {
  try {
    return git(args, root).split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  } catch {
    return [];
  }
}

// src/hooks/stop.ts
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync as existsSync11, mkdirSync as mkdirSync4, openSync, readFileSync as readFileSync9, readdirSync as readdirSync3, statSync as statSync5, writeFileSync as writeFileSync5, writeSync } from "node:fs";
import { dirname as dirname5, join as join13 } from "node:path";

// src/config.ts
import { existsSync as existsSync10, readFileSync as readFileSync8 } from "node:fs";
import { join as join12 } from "node:path";
var CONFIG_FILE = ".dev/config.json";
var DEFAULT_CONFIG = { verifyOnStop: true };
function readConfig(root) {
  const config = { ...DEFAULT_CONFIG };
  const file = join12(root, CONFIG_FILE);
  if (!existsSync10(file)) return config;
  let data;
  try {
    data = JSON.parse(readFileSync8(file, "utf8"));
  } catch {
    return config;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return config;
  const { verifyOnStop } = data;
  if (typeof verifyOnStop === "boolean") config.verifyOnStop = verifyOnStop;
  return config;
}

// src/hooks/stop.ts
var VERIFY_DIR = ".dev/.local/verify";
var VERIFY_STATE_FILE = ".dev/.local/verify-state.json";
var FAILURE_LINES_MAX = 30;
var VERIFY_BUDGET_MS = 28e4;
var FAILURE_LINE = /erro|fail|falh|✗|×|assert|exception|traceback|panic|\bTS\d{4}\b|ERR!|expected|received|esperad|\.(?:test|spec)\.[cm]?[jt]sx?:\d+/i;
var ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
var LINE_MAX = 300;
var SKIP_DIRS = /* @__PURE__ */ new Set([".git", "node_modules"]);
function stopHook(root, input, { now = /* @__PURE__ */ new Date(), budgetMs = VERIFY_BUDGET_MS } = {}) {
  const state = readState(root);
  if (!state) return { action: "ignorado", reason: "nenhuma fase ativa" };
  if (input.stop_hook_active === true) return { action: "ignorado", reason: "stop_hook_active" };
  if (!readConfig(root).verifyOnStop) return { action: "ignorado", reason: "verifyOnStop desligado" };
  let ref;
  let phaseId;
  let files;
  let verify;
  try {
    const entry = findPlan(root, state.plan);
    const phase = findPhase(entry, state.phase);
    ref = `${entry.id}/${phase.id}`;
    phaseId = phase.id;
    files = textList(phase.yaml.data.files);
    verify = textList(phase.yaml.data.verify);
  } catch (err) {
    return { action: "ignorado", reason: err.message };
  }
  if (!verify.length) return { action: "ignorado", reason: "a fase n\xE3o tem verify" };
  const approved = readApproved(root);
  if (approved[ref]?.fingerprint === phaseFingerprint(root, files, verify)) {
    appendMetric(root, { evento: "verify", fase: ref, resultado: "sem-mudanca" }, now);
    return { action: "sem-mudanca" };
  }
  const log = logPath(root, now);
  const run = runVerify(root, log, verify, budgetMs);
  if (!run.failed) {
    approved[ref] = { fingerprint: phaseFingerprint(root, files, verify), at: now.toISOString() };
    writeApproved(root, approved);
    appendMetric(root, { evento: "verify", fase: ref, resultado: "aprovado", duracao_ms: run.durationMs, log }, now);
    return { action: "aprovado", log };
  }
  const { command, output, timedOut } = run.failed;
  appendMetric(root, { evento: "verify", fase: ref, resultado: "falhou", comando: command, duracao_ms: run.durationMs, log }, now);
  const { lines, hidden } = failureLines(output);
  const context = [
    `[builderdev] verifica\xE7\xE3o da fase ${phaseId} falhou${timedOut ? ` (tempo esgotado ap\xF3s ${Math.round(budgetMs / 1e3)} s)` : ""}: ${command}`,
    ...lines.map((l) => `  ${l}`),
    ...hidden ? [`(+${hidden} linhas de falha no log)`] : [],
    `Log completo: ${log}`
  ].join("\n");
  return { action: "falhou", log, output: { hookSpecificOutput: { hookEventName: "Stop", additionalContext: context } } };
}
function runVerify(root, log, commands2, budgetMs) {
  const file = join13(root, log);
  mkdirSync4(dirname5(file), { recursive: true });
  const fd = openSync(file, "a");
  const started = Date.now();
  try {
    writeSync(fd, `# builderdev verify \xB7 ${new Date(started).toISOString()}
`);
    for (const command of commands2) {
      writeSync(fd, `
$ ${command}
`);
      const offset = statSync5(file).size;
      const remaining = budgetMs - (Date.now() - started);
      const r = remaining > 0 ? spawnSync(command, {
        cwd: root,
        shell: true,
        stdio: ["ignore", fd, fd],
        timeout: remaining,
        windowsHide: true,
        env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" }
      }) : null;
      const timedOut = !r || r.error?.code === "ETIMEDOUT";
      const ok = !!r && !r.error && r.status === 0;
      writeSync(fd, `[${timedOut ? "tempo esgotado" : `saiu com ${r?.status ?? r?.signal ?? r?.error?.message}`}]
`);
      if (!ok) {
        const output = readFileSync9(file).subarray(offset).toString("utf8");
        return { durationMs: Date.now() - started, failed: { command, output, timedOut } };
      }
    }
    return { durationMs: Date.now() - started };
  } finally {
    closeSync(fd);
  }
}
function failureLines(output) {
  const all = output.replace(ANSI, "").split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim() && !/^\[(?:saiu com|tempo esgotado)/.test(l));
  const matched = [...new Set(all.filter((l) => FAILURE_LINE.test(l)))];
  const picked = matched.length ? matched : all.slice(-10);
  const clip = (l) => l.length > LINE_MAX ? `${l.slice(0, LINE_MAX - 1)}\u2026` : l;
  return { lines: picked.slice(0, FAILURE_LINES_MAX).map(clip), hidden: Math.max(0, picked.length - FAILURE_LINES_MAX) };
}
function phaseFingerprint(root, files, verify) {
  const hash = createHash("sha256");
  hash.update(`${JSON.stringify(verify)}
`);
  for (const [rel, abs] of expandFiles(root, files)) {
    hash.update(`${rel}\0${abs ? createHash("sha256").update(readFileSync9(abs)).digest("hex") : "ausente"}
`);
  }
  return hash.digest("hex");
}
function expandFiles(root, patterns) {
  const found = /* @__PURE__ */ new Map();
  for (const raw of patterns) {
    const pattern = raw.replace(/\\/g, "/").replace(/^\.\//, "");
    const globAt = pattern.search(/[*?[]/);
    if (globAt >= 0) {
      const base = pattern.slice(0, pattern.lastIndexOf("/", globAt) + 1);
      const re = globRegex(pattern);
      for (const rel of walk(root, base)) if (re.test(rel)) found.set(rel, join13(root, rel));
      continue;
    }
    const abs = join13(root, pattern);
    if (!existsSync11(abs)) found.set(pattern.replace(/\/$/, ""), null);
    else if (statSync5(abs).isDirectory()) for (const rel of walk(root, pattern)) found.set(rel, join13(root, rel));
    else found.set(pattern, abs);
  }
  return [...found].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
}
function walk(root, dir) {
  const prefix = dir && !dir.endsWith("/") ? `${dir}/` : dir;
  const abs = join13(root, prefix);
  if (!existsSync11(abs) || !statSync5(abs).isDirectory()) return [];
  const out = [];
  for (const entry of readdirSync3(abs, { withFileTypes: true })) {
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...walk(root, rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}
function globRegex(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      const slash = pattern[i + 2] === "/";
      re += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}
function readApproved(root) {
  try {
    const data = JSON.parse(readFileSync9(join13(root, VERIFY_STATE_FILE), "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}
function writeApproved(root, approved) {
  const file = join13(root, VERIFY_STATE_FILE);
  mkdirSync4(dirname5(file), { recursive: true });
  writeFileSync5(file, `${JSON.stringify(approved, null, 2)}
`);
}
function logPath(root, now) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  for (let n = 1; ; n++) {
    const rel = `${VERIFY_DIR}/${stamp}${n > 1 ? `-${n}` : ""}.log`;
    if (!existsSync11(join13(root, rel))) return rel;
  }
}

// src/init.ts
import { constants, copyFileSync as copyFileSync2, existsSync as existsSync12, mkdirSync as mkdirSync5, readFileSync as readFileSync10, writeFileSync as writeFileSync6 } from "node:fs";
import { dirname as dirname6, join as join14, resolve as resolve6 } from "node:path";
import { fileURLToPath } from "node:url";
var DEV_DIRS = [".dev", ".dev/plans", ".dev/memory", ".dev/errors", ".dev/templates", ".dev/.local"];
var IGNORED = [".dev/.local/", ".dev/memory/index.md", ".dev/errors/index.md"];
function pluginTemplatesDir() {
  return resolve6(dirname6(fileURLToPath(import.meta.url)), "..", "templates");
}
function init(root, templatesDir = pluginTemplatesDir()) {
  const actions = [];
  for (const dir of DEV_DIRS) {
    const path = join14(root, dir);
    if (!existsSync12(path)) {
      mkdirSync5(path, { recursive: true });
      actions.push(`criado      ${dir}/`);
    }
  }
  const template = join14(root, ".dev/templates/plan.md");
  if (!existsSync12(template)) {
    copyFileSync2(join14(templatesDir, "plan.md"), template, constants.COPYFILE_EXCL);
    actions.push("criado      .dev/templates/plan.md");
  }
  const gitignore = join14(root, ".gitignore");
  const current = existsSync12(gitignore) ? readFileSync10(gitignore, "utf8") : null;
  const existing = new Set((current ?? "").split(/\r?\n/).map((l) => l.trim().replace(/^\//, "").replace(/\/$/, "")));
  const missing = IGNORED.filter((rule) => !existing.has(rule.replace(/\/$/, "")));
  if (missing.length) {
    const eol = current?.includes("\r\n") ? "\r\n" : "\n";
    const prefix = current && !current.endsWith("\n") ? eol : "";
    writeFileSync6(gitignore, `${current ?? ""}${prefix}${missing.map((rule) => `${rule}${eol}`).join("")}`);
    actions.push(`${current === null ? "criado    " : "atualizado"}  .gitignore (${missing.join(", ")})`);
  }
  return actions;
}

// src/memory/entry.ts
import { existsSync as existsSync13, mkdirSync as mkdirSync6, writeFileSync as writeFileSync7 } from "node:fs";
import { join as join15 } from "node:path";
var PLACEHOLDERS = ["<t\xEDtulo>", "<O que vale", "<Detalhes que"];
function newEntry(root, track, slug, today = localDate()) {
  if (!TRACKS.includes(track)) throw new ProjectError(`trilha "${track}" inv\xE1lida: use --track ${TRACKS.join(" | ")}`);
  const [slugProblem] = slugProblems(slug);
  if (slugProblem) throw new ProjectError(slugProblem);
  if (!existsSync13(join15(root, ".dev"))) throw new ProjectError("pasta .dev/ n\xE3o encontrada: rode builderdev init antes");
  for (const t of TRACKS) {
    const existing = `${TRACK_DIRS[t]}/${slug}.md`;
    if (existsSync13(join15(root, existing))) {
      const hint = t === "bug" ? " (se \xE9 o mesmo erro, incremente occurrences)" : "";
      throw new ProjectError(`j\xE1 existe ${existing}: atualize essa entrada${hint} ou escolha outro slug`);
    }
  }
  const rel = `${TRACK_DIRS[track]}/${slug}.md`;
  mkdirSync6(join15(root, TRACK_DIRS[track]), { recursive: true });
  writeFileSync7(join15(root, rel), entryTemplate(track, today), { flag: "wx" });
  return rel;
}
function entryTemplate(track, today) {
  const common = [
    `type:              # ${TYPES[track].join(" | ")}`,
    "module:            # \xE1rea do c\xF3digo; reuse um valor que o \xEDndice j\xE1 usa",
    "summary:           # uma linha, at\xE9 120 caracteres; vira a linha do \xEDndice",
    "tags: []           # 1 a 8, min\xFAsculas com h\xEDfen; reuse as do \xEDndice"
  ];
  const bug = [
    "symptoms: []       # 1 a 5: como o erro aparece (mensagem, comportamento)",
    "root_cause:",
    "resolution:",
    "occurrences: 1     # quando o mesmo erro voltar, incremente em vez de criar outra entrada"
  ];
  const body = track === "bug" ? "<Detalhes que o frontmatter n\xE3o cobre: exemplo m\xEDnimo, comando que reproduz, armadilha. At\xE9 40 linhas.>" : "<O que vale, por que vale e onde aparece no c\xF3digo. At\xE9 40 linhas.>";
  return [
    "---",
    `track: ${track}`,
    ...common,
    ...track === "bug" ? bug : [],
    "applies_when: []   # opcional, at\xE9 5: situa\xE7\xF5es em que a entrada se aplica",
    `created: ${today}`,
    "---",
    "",
    "# <t\xEDtulo>",
    "",
    body,
    ""
  ].join("\n");
}
function localDate(now = /* @__PURE__ */ new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// src/memory/lint.ts
import { existsSync as existsSync14, readFileSync as readFileSync11 } from "node:fs";
import { basename as basename3, dirname as dirname7, join as join16, resolve as resolve7 } from "node:path";
var ENTRY_MAX_LINES = 40;
var CLAUDE_MD_MAX_LINES = 150;
var DIR_TRACKS = { memory: "conhecimento", errors: "bug" };
function trackOfPath(path) {
  return DIR_TRACKS[basename3(dirname7(resolve7(path)))] ?? null;
}
function isEntryPath(path) {
  return path.endsWith(".md") && basename3(path) !== INDEX_FILE && trackOfPath(path) !== null;
}
function lintEntry(entry) {
  const problems = validateEntry(entry);
  for (const message of slugProblems(entry.slug)) problems.push({ line: 1, severity: "erro", code: "slug-invalid", message });
  const expected = trackOfPath(entry.path);
  const track = entry.frontmatter.track;
  if (expected && TRACKS.includes(track) && track !== expected) {
    problems.push({
      line: entry.fieldLines.track ?? 1,
      severity: "erro",
      code: "track-dir-mismatch",
      message: `track "${String(track)}" fica em ${TRACK_DIRS[track]}/, n\xE3o em ${TRACK_DIRS[expected]}/`
    });
  }
  const body = bodyLines(entry);
  if (body.length > ENTRY_MAX_LINES) {
    problems.push({ line: entry.bodyStartLine, severity: "erro", code: "entry-too-long", message: `corpo com ${body.length} linhas (m\xE1ximo ${ENTRY_MAX_LINES})` });
  }
  entry.lines.forEach((text, i) => {
    const placeholder = i + 1 >= entry.bodyStartLine && PLACEHOLDERS.find((p) => text.includes(p));
    if (placeholder) {
      problems.push({ line: i + 1, severity: "erro", code: "entry-placeholder", message: `linha ainda com o texto do modelo (${placeholder}): substitua pelo conte\xFAdo` });
    }
  });
  return problems.sort((a, b) => a.line - b.line);
}
function lintMemory(root, targets) {
  const dirs = TRACKS.map((track) => ({ track, dir: resolve7(root, TRACK_DIRS[track]) }));
  const projectFiles = dirs.flatMap(({ dir }) => listEntryFiles(dir).map((f) => resolve7(f)));
  const targetFiles = targets ? targets.map((t) => resolve7(t)) : projectFiles;
  const entries = /* @__PURE__ */ new Map();
  const reports = /* @__PURE__ */ new Map();
  for (const file of /* @__PURE__ */ new Set([...projectFiles, ...targetFiles])) {
    try {
      entries.set(file, readEntry(file));
    } catch (err) {
      if (!(err instanceof EntryParseError)) throw err;
      reports.set(file, [{ line: err.line, severity: "erro", code: "frontmatter-invalid", message: err.message }]);
    }
  }
  const corpus = corpusProblems([...entries.values()]);
  const out = targetFiles.map((file) => {
    const entry = entries.get(file);
    const problems = entry ? [...lintEntry(entry), ...corpus.get(file) ?? []].sort((a, b) => a.line - b.line) : reports.get(file) ?? [];
    return { file, problems };
  });
  for (const { track, dir } of dirs) {
    if (targets && !targetFiles.some((f) => dirname7(f) === dir)) continue;
    const inDir = [...entries.values()].filter((e) => dirname7(resolve7(e.path)) === dir);
    const lines = indexLineCount(buildIndex(track, inDir));
    if (lines > INDEX_MAX_LINES) {
      out.push({
        file: join16(dir, INDEX_FILE),
        problems: [{ line: 1, severity: "erro", code: "index-too-long", message: `o \xEDndice teria ${lines} linhas (m\xE1ximo ${INDEX_MAX_LINES}): funda ou remova entradas` }]
      });
    }
  }
  if (!targets) {
    const claude = join16(root, ".dev", "CLAUDE.md");
    if (existsSync14(claude)) out.push({ file: claude, problems: lintClaudeMd(claude) });
  }
  return out;
}
function lintClaudeMd(path) {
  const lines = indexLineCount(readFileSync11(path, "utf8"));
  return lines > CLAUDE_MD_MAX_LINES ? [{ line: CLAUDE_MD_MAX_LINES + 1, severity: "erro", code: "claude-md-too-long", message: `.dev/CLAUDE.md tem ${lines} linhas (m\xE1ximo ${CLAUDE_MD_MAX_LINES})` }] : [];
}
function corpusProblems(entries) {
  const out = /* @__PURE__ */ new Map();
  const add = (entry, problem) => out.set(entry.path, [...out.get(entry.path) ?? [], problem]);
  const modules = [];
  const tags = [];
  for (const entry of entries) {
    const fm = entry.frontmatter;
    if (typeof fm.module === "string" && fm.module.trim()) modules.push({ value: fm.module.trim(), entry });
    if (Array.isArray(fm.tags)) {
      for (const tag of new Set(fm.tags.filter((t) => typeof t === "string" && t.trim() !== ""))) tags.push({ value: tag.trim(), entry });
    }
  }
  for (const [kind, uses] of [["module", modules], ["tag", tags]]) {
    for (const { use, canonical, count } of nearDuplicates(uses)) {
      const usedIn = `${kind === "tag" ? "j\xE1 usada" : "j\xE1 usado"} em ${count} ${count === 1 ? "entrada" : "entradas"}`;
      add(use.entry, {
        line: use.entry.fieldLines[kind === "tag" ? "tags" : "module"] ?? 1,
        severity: "aviso",
        code: `corpus-${kind}`,
        message: `${kind} "${use.value}" \xE9 quase igual a "${canonical}", ${usedIn}: use "${canonical}"`
      });
    }
  }
  return out;
}
function nearDuplicates(uses) {
  const stats = /* @__PURE__ */ new Map();
  for (const { value, entry } of uses) {
    const created = typeof entry.frontmatter.created === "string" ? entry.frontmatter.created : "9999-99-99";
    const s = stats.get(value);
    stats.set(value, s ? { count: s.count + 1, created: s.created < created ? s.created : created } : { count: 1, created });
  }
  const values = [...stats.keys()].sort();
  const parent = new Map(values.map((v) => [v, v]));
  const find = (v) => parent.get(v) === v ? v : find(parent.get(v));
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (similar(values[i], values[j])) parent.set(find(values[j]), find(values[i]));
    }
  }
  const canonical = /* @__PURE__ */ new Map();
  for (const v of values) {
    const group = find(v);
    const best = canonical.get(group);
    if (best === void 0 || preferred(v, best)) canonical.set(group, v);
  }
  return uses.map((use) => {
    const c = canonical.get(find(use.value));
    return { use, canonical: c, count: stats.get(c).count };
  }).filter(({ use, canonical: c }) => use.value !== c);
  function preferred(a, b) {
    const sa = stats.get(a);
    const sb = stats.get(b);
    if (sa.count !== sb.count) return sa.count > sb.count;
    const clean = (v) => /^[\p{Ll}\d]+(?:-[\p{Ll}\d]+)*$/u.test(v);
    if (clean(a) !== clean(b)) return clean(a);
    if (sa.created !== sb.created) return sa.created < sb.created;
    return a < b;
  }
}
function similar(a, b) {
  const x = normalizeValue(a);
  const y = normalizeValue(b);
  if (x === y) return true;
  const shorter = Math.min(x.length, y.length);
  const tolerance = shorter >= 8 ? 2 : shorter >= 5 ? 1 : 0;
  return tolerance > 0 && editDistance(x, y) <= tolerance;
}
function normalizeValue(value) {
  let s = value.normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "").toLowerCase().replace(/[\s._-]/g, "");
  if (s.length > 3 && s.endsWith("s")) s = s.slice(0, -1);
  return s;
}
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// src/memory/recall.ts
import { readFileSync as readFileSync12 } from "node:fs";
import { relative as relative4, sep as sep3 } from "node:path";
var RECALL_LIMIT = 5;
var FULL_LIMIT = 3;
var FIELDS = [
  { name: "tags", weight: 6, kind: "keyword" },
  { name: "module", weight: 5, kind: "keyword" },
  { name: "applies_when", weight: 4, kind: "text" },
  { name: "summary", weight: 3, kind: "text" },
  { name: "title", weight: 2, kind: "text" },
  { name: "symptoms", weight: 1, kind: "text" }
];
var STOPWORDS = new Set(
  "a o as os e de da do das dos em no na nos nas um uma uns umas para por com sem que se ao aos como mais the of and to in on for with is".split(" ")
);
function parseTerms(args) {
  const seen = /* @__PURE__ */ new Set();
  const terms = [];
  for (const raw of args.join(" ").split(/[\s,]+/)) {
    const term = raw.trim();
    const key = normalizeWord(term);
    if (key.length < 2 || STOPWORDS.has(term.toLowerCase()) || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}
function recall(root, terms, limit = RECALL_LIMIT) {
  const entries = TRACKS.flatMap((track) => loadTrack(root, track).entries);
  return entries.map((entry) => scoreEntry(entry, terms)).filter((hit) => hit.score > 0).sort(
    (a, b) => b.score - a.score || totalValues(b) - totalValues(a) || (a.entry.slug < b.entry.slug ? -1 : a.entry.slug > b.entry.slug ? 1 : 0)
  ).slice(0, limit);
}
function scoreEntry(entry, terms) {
  const f = entryFields(entry);
  const values = {
    tags: f.tags,
    module: f.module ? [f.module] : [],
    applies_when: f.appliesWhen,
    summary: f.summary ? [f.summary] : [],
    title: [entry.title, entry.slug.replace(/-/g, " ")],
    symptoms: f.symptoms
  };
  const found = /* @__PURE__ */ new Map();
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of FIELDS) {
      const hits = field.kind === "keyword" ? values[field.name].filter((v) => keywordMatches(v, term)) : values[field.name].some((v) => textMatches(v, term)) ? [term] : [];
      if (!hits.length) continue;
      best = Math.max(best, field.weight);
      const list = found.get(field.name) ?? [];
      for (const h of hits) if (!list.includes(h)) list.push(h);
      found.set(field.name, list);
    }
    score += best;
  }
  const matches = FIELDS.filter((field) => found.has(field.name)).map((field) => ({
    field: field.name,
    // Tags na ordem em que aparecem na entrada.
    values: field.name === "tags" ? values.tags.filter((t) => found.get("tags").includes(t)) : found.get(field.name)
  }));
  return { entry, score, matches };
}
function totalValues(hit) {
  return hit.matches.reduce((n, m) => n + m.values.length, 0);
}
function keywordMatches(value, term) {
  const t = normalizeWord(term);
  return normalizeWord(value) === t || value.split(/[-_\s]+/).some((part) => normalizeWord(part) === t);
}
function textMatches(text, term) {
  const t = normalizeWord(term);
  return words(text).some((w) => w === t || t.length >= 4 && w.startsWith(t));
}
function words(text) {
  return text.normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stripPlural);
}
function normalizeWord(value) {
  return stripPlural(value.normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "").toLowerCase().replace(/[\s._-]/g, ""));
}
function stripPlural(word) {
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}
function formatRecall(root, hits, options = {}) {
  const rel = (p) => relative4(root, p).split(sep3).join("/");
  const paths = hits.map((h) => rel(h.entry.path));
  const width = Math.max(0, ...paths.map((p) => p.length));
  const out = [];
  hits.forEach((hit, i) => {
    const f = entryFields(hit.entry);
    const indent = " ".repeat(`${i + 1}. `.length);
    out.push(`${i + 1}. ${paths[i].padEnd(width)}   ${f.track || "?"}/${f.type || "?"} \xB7 ${f.module || "?"}`);
    out.push(`${indent}${f.summary || "(sem summary)"}`);
    out.push(`${indent}coincidiu: ${hit.matches.map((m) => `${m.field}(${m.values.join(", ")})`).join(", ")}`);
  });
  if (options.full) {
    hits.slice(0, FULL_LIMIT).forEach((hit, i) => {
      const content = readFileSync12(hit.entry.path, "utf8").replace(/\r\n/g, "\n").replace(/\n+$/, "");
      out.push("", `===== ${paths[i]} =====`, content);
    });
  }
  return out.join("\n");
}

// src/migrate/split.ts
var import_yaml3 = __toESM(require_dist(), 1);
import { mkdirSync as mkdirSync7, readFileSync as readFileSync13, readdirSync as readdirSync4, rmSync as rmSync3, writeFileSync as writeFileSync8 } from "node:fs";
import { join as join17, relative as relative5, resolve as resolve8, sep as sep4 } from "node:path";
var MIGRATION_DIR = ".dev/.local/migration";
var HEADING2 = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
var FENCE3 = /^ {0,3}(`{3,}|~{3,})/;
var CANDIDATE_FILE = /^\d{3,}\.md$/;
function splitMarkdown(source, text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const starts = [];
  let fence = null;
  lines.forEach((line, i) => {
    const fenceMatch = FENCE3.exec(line);
    if (fence) {
      if (fenceMatch?.[1] && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && line.trim() === fenceMatch[1]) fence = null;
      return;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      return;
    }
    const m = HEADING2.exec(line);
    if (m?.[1]) starts.push({ index: i, level: m[1].length, title: (m[2] ?? "").trim() });
  });
  const candidates = [];
  const add = (from, to, path, hasHeading) => {
    let first = from;
    let last = to;
    while (first <= last && !lines[first].trim()) first++;
    while (last >= first && !lines[last].trim()) last--;
    if (last < first || hasHeading && last === from) return;
    candidates.push({ source, startLine: first + 1, endLine: last + 1, path, lines: lines.slice(first, last + 1) });
  };
  const docTitle = starts[0]?.level === 1 && starts.filter((s) => s.level === 1).length === 1 ? starts[0] : null;
  add(0, (starts[0]?.index ?? lines.length) - 1, [], false);
  const stack = [];
  starts.forEach((h, i) => {
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    stack.push(h);
    const path = stack.filter((s) => s !== docTitle || stack.length === 1).map((s) => s.title);
    add(h.index, (starts[i + 1]?.index ?? lines.length) - 1, path, true);
  });
  return candidates;
}
function splitFiles(root, files) {
  const candidates = files.flatMap((file) => {
    const abs = resolve8(root, file);
    return splitMarkdown(relative5(root, abs).split(sep4).join("/"), readFileSync13(abs, "utf8"));
  });
  const dir = join17(root, MIGRATION_DIR);
  mkdirSync7(dir, { recursive: true });
  const old = readdirSync4(dir).filter((f) => CANDIDATE_FILE.test(f));
  for (const f of old) rmSync3(join17(dir, f));
  const digits = Math.max(3, String(candidates.length).length);
  const written = candidates.map((candidate, i) => {
    const file = `${String(i + 1).padStart(digits, "0")}.md`;
    writeFileSync8(join17(dir, file), candidateSource(candidate, file.replace(/\.md$/, "")));
    return { file, candidate };
  });
  return { dir: MIGRATION_DIR, written, replaced: old.length };
}
function candidateSource(c, number) {
  const meta = { candidato: number, origem: originLabel(c), secao: sectionLabel(c) };
  return `---
${(0, import_yaml3.stringify)(meta, { lineWidth: 0 })}---

${c.lines.join("\n")}
`;
}
function formatSplit(result) {
  const width = Math.max(0, ...result.written.map(({ candidate }) => originLabel(candidate).length));
  const out = result.written.map(({ file, candidate: c }) => {
    const size = `${c.lines.length} ${c.lines.length === 1 ? "linha" : "linhas"}`;
    return `${file.replace(/\.md$/, "")}  ${originLabel(c).padEnd(width)}  ${sectionLabel(c)} (${size})`;
  });
  const replaced = result.replaced ? `; ${result.replaced} de uma execu\xE7\xE3o anterior substitu\xEDdos` : "";
  out.push(`${result.written.length} ${result.written.length === 1 ? "candidato" : "candidatos"} em ${result.dir}/${replaced}`);
  return out.join("\n");
}
function originLabel(c) {
  return `${c.source}:${c.startLine}-${c.endLine}`;
}
function sectionLabel(c) {
  return c.path.length ? c.path.join(" \u203A ") : "(sem t\xEDtulo)";
}

// src/plan/brief.ts
var import_yaml4 = __toESM(require_dist(), 1);
var PLAN_SECTIONS = ["Contexto", "Fora do escopo"];
function brief(entry, phaseId) {
  const { plan } = entry;
  const phase = findPhase(entry, phaseId);
  const slice = (from, to) => plan.lines.slice(from - 1, to).join("\n");
  const planTitle = typeof plan.frontmatter.title === "string" ? plan.frontmatter.title.trim() : entry.id;
  const out = [`# ${planTitle} \xB7 ${entry.id}/${phase.id}`, `Plano: ${entry.path}`];
  const level2 = flattenSections(plan.sections).filter((s) => s.level === 2);
  for (const name of PLAN_SECTIONS) {
    const section = level2.find((s) => s.title.trim().toLowerCase() === name.toLowerCase());
    if (section) out.push("", slice(section.line, section.endLine));
  }
  out.push("", "## Entrada no YAML", "", "```yaml", yamlEntry(plan, phase.id), "```");
  const body = plan.bodyPhases.find((b) => b.id === phase.id);
  out.push("", body ? slice(body.line, body.endLine) : `(sem "## ${phase.id} \xB7 ..." no corpo do plano)`);
  return `${out.join("\n")}
`;
}
function yamlEntry(plan, phaseId) {
  const phase = planPhases(plan).find((p) => p.id === phaseId);
  const start = phase.yaml.line - 1;
  const first = plan.lines[start] ?? "";
  const dash = /^(\s*)-\s/.exec(first);
  if (!dash) return (0, import_yaml4.stringify)([phase.yaml.data]).trimEnd();
  const indent = dash[1].length;
  const closeIndex = plan.bodyStartLine - 2;
  const lines = [first];
  for (let i = start + 1; i < closeIndex; i++) {
    const line = plan.lines[i] ?? "";
    if (line.trim() && line.length - line.trimStart().length <= indent) break;
    lines.push(line);
  }
  while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
  return lines.map((l) => l.slice(Math.min(indent, l.length - l.trimStart().length))).join("\n");
}

// src/plan/lint.ts
import { readFileSync as readFileSync14 } from "node:fs";
var COMMIT_TYPES = ["feat", "fix", "refactor", "test", "docs", "chore", "perf", "style", "build", "ci"];
var COMMIT_MSG = new RegExp(`^(${COMMIT_TYPES.join("|")}): \\S`);
var PHASE_ID = /^f\d+$/;
var OBJECTIVE_MAX_LINES = 3;
function lintPlanFile(path) {
  return lintPlanSource(readFileSync14(path, "utf8"));
}
function lintPlanSource(source) {
  try {
    return lintPlan(parsePlan(source));
  } catch (err) {
    if (err instanceof PlanParseError) {
      return [{ line: err.line, severity: "erro", code: "frontmatter-invalid", message: err.message }];
    }
    throw err;
  }
}
function lintPlan(plan) {
  const problems = [];
  const error = (line, code, message) => problems.push({ line, severity: "erro", code, message });
  const warn = (line, code, message) => problems.push({ line, severity: "aviso", code, message });
  const fm = plan.frontmatter;
  for (const field of ["id", "title"]) {
    if (!nonEmptyString(fm[field])) error(plan.frontmatterLines[field] ?? 1, "plan-field-missing", `campo "${field}" ausente ou vazio no frontmatter`);
  }
  const topSections = flattenSections(plan.sections).filter((s) => s.level === 2);
  if (!topSections.some((s) => sameTitle(s.title, "Contexto"))) {
    const h1 = plan.headings.find((h) => h.level === 1);
    error(h1?.line ?? plan.bodyStartLine, "section-missing", 'falta a se\xE7\xE3o "## Contexto"');
  }
  if (!Array.isArray(fm.phases) || fm.phases.length === 0) {
    error(plan.frontmatterLines.phases ?? 1, "phases-missing", '"phases" deve ser uma lista com pelo menos uma fase (f1)');
  }
  const yamlIds = /* @__PURE__ */ new Map();
  plan.phases.forEach((p, index) => {
    if (!p.isMapping) {
      error(p.line, "phase-invalid", `a fase na posi\xE7\xE3o ${index + 1} n\xE3o \xE9 um mapeamento (id, title, files...)`);
      return;
    }
    const at = (field) => p.fieldLines[field] ?? p.line;
    const id = p.data.id;
    if (typeof id !== "string" || !PHASE_ID.test(id)) {
      const shown = id === void 0 ? "sem id" : `id "${String(id)}"`;
      error(at("id"), "phase-id-format", `fase na posi\xE7\xE3o ${index + 1} com ${shown}: use o formato f<n\xFAmero> (f1, f2...)`);
    } else if (yamlIds.has(id)) {
      error(at("id"), "phase-id-duplicate", `id "${id}" repetido no YAML`);
    } else {
      yamlIds.set(id, index);
    }
    const label = typeof id === "string" ? id : `fase ${index + 1}`;
    if (!nonEmptyString(p.data.title)) error(at("title"), "phase-title-missing", `${label} sem "title"`);
    for (const field of ["files", "verify"]) {
      const value = p.data[field];
      if (!Array.isArray(value) || value.length === 0) {
        error(at(field), `${field}-empty`, `${label}: "${field}" deve ser uma lista n\xE3o vazia`);
      } else if (!value.every(nonEmptyString)) {
        error(at(field), `${field}-empty`, `${label}: "${field}" tem item vazio ou que n\xE3o \xE9 texto`);
      }
    }
    const msg = p.data.commit_msg;
    if (typeof msg !== "string" || !COMMIT_MSG.test(msg)) {
      const shown = msg === void 0 ? "ausente" : `"${String(msg)}"`;
      error(at("commit_msg"), "commit-msg-format", `${label}: commit_msg ${shown} fora do formato "tipo: texto" (tipo: ${COMMIT_TYPES.join("|")})`);
    }
    if (p.data.needs !== void 0 && !(Array.isArray(p.data.needs) && p.data.needs.every((n) => typeof n === "string"))) {
      error(at("needs"), "needs-invalid", `${label}: "needs" deve ser uma lista de ids, ex.: [f1]`);
    }
  });
  const validPhases = [...yamlIds].map(([id, index]) => ({ id, phase: plan.phases[index] }));
  for (const { id, phase } of validPhases) {
    const needs = phase.data.needs;
    if (!Array.isArray(needs)) continue;
    for (const dep of needs) {
      if (typeof dep === "string" && !yamlIds.has(dep)) {
        error(phase.fieldLines.needs ?? phase.line, "needs-unknown", `${id} depende de "${dep}", que n\xE3o existe`);
      }
    }
  }
  for (const cycle of findCycles(validPhases.map(({ id, phase }) => ({ id, needs: phase.data.needs })))) {
    const first = validPhases.find((v) => v.id === cycle[0]);
    error(first.phase.fieldLines.needs ?? first.phase.line, "needs-cycle", `ciclo de depend\xEAncias: ${cycle.join(" \u2192 ")}`);
  }
  const bodyById = /* @__PURE__ */ new Map();
  for (const b of plan.bodyPhases) {
    if (bodyById.has(b.id)) {
      error(b.line, "phase-body-duplicate", `"## ${b.id} \xB7 ..." aparece mais de uma vez no corpo`);
      continue;
    }
    bodyById.set(b.id, b);
    if (!yamlIds.has(b.id)) {
      error(b.line, "phase-missing-yaml", `"## ${b.id} \xB7 ${b.title}" n\xE3o tem fase correspondente no YAML`);
    }
  }
  for (const { id, phase } of validPhases) {
    const body = bodyById.get(id);
    const title = phase.data.title;
    if (!body) {
      error(phase.line, "phase-missing-body", `${id} est\xE1 no YAML mas n\xE3o tem "## ${id} \xB7 ${nonEmptyString(title) ? title : "<t\xEDtulo>"}" no corpo`);
    } else if (nonEmptyString(title) && body.title !== title.trim()) {
      error(body.line, "phase-title-mismatch", `"## ${id} \xB7 ${body.title}" difere do YAML "${title.trim()}"`);
    }
  }
  for (const b of bodyById.values()) {
    const find = (sections, level, title) => sections.find((s) => s.level === level && sameTitle(s.title, title));
    const objetivo = find(b.sections, 3, "Objetivo");
    const escopo = find(b.sections, 3, "Escopo");
    if (!objetivo) error(b.line, "section-missing", `${b.id} sem "### Objetivo"`);
    if (!escopo) error(b.line, "section-missing", `${b.id} sem "### Escopo"`);
    else if (!find(escopo.children, 4, "C\xF3digo")) error(escopo.line, "section-missing", `${b.id} sem "#### C\xF3digo" dentro de "### Escopo"`);
    if (!find(b.sections, 3, "Valida\xE7\xE3o visual")) error(b.line, "section-missing", `${b.id} sem "### Valida\xE7\xE3o visual"`);
    if (objetivo) {
      const count = textLines(plan.lines, objetivo);
      if (count > OBJECTIVE_MAX_LINES) {
        warn(objetivo.line, "objective-too-long", `Objetivo da ${b.id} tem ${count} linhas (m\xE1ximo ${OBJECTIVE_MAX_LINES})`);
      }
    }
  }
  return problems.sort((a, b) => a.line - b.line);
}
function textLines(lines, section) {
  const end = section.children[0] ? section.children[0].line - 1 : section.endLine;
  const text = lines.slice(section.line, end).join("\n").replace(/<!--[\s\S]*?-->/g, "");
  return text.split("\n").filter((l) => l.trim() !== "").length;
}
function findCycles(phases) {
  const ids = phases.map((p) => p.id);
  const deps = /* @__PURE__ */ new Map();
  phases.forEach((p, i) => {
    const explicit = Array.isArray(p.needs) ? p.needs.filter((n) => typeof n === "string" && ids.includes(n)) : null;
    deps.set(p.id, explicit ?? (i > 0 ? [ids[i - 1]] : []));
  });
  const cycles = [];
  const seen = /* @__PURE__ */ new Set();
  const state = /* @__PURE__ */ new Map();
  const path = [];
  const visit = (id) => {
    state.set(id, "visiting");
    path.push(id);
    for (const dep of deps.get(id) ?? []) {
      if (state.get(dep) === "visiting") {
        const cycle = path.slice(path.indexOf(dep));
        const start = cycle.reduce((best, c) => ids.indexOf(c) < ids.indexOf(best) ? c : best);
        const rotated = [...cycle.slice(cycle.indexOf(start)), ...cycle.slice(0, cycle.indexOf(start))];
        const key = rotated.join(",");
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push([...rotated, start]);
        }
      } else if (!state.has(dep)) {
        visit(dep);
      }
    }
    path.pop();
    state.set(id, "done");
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  return cycles;
}
function formatReport(reports) {
  const rows = reports.flatMap((r) => r.problems.map((p) => ({ loc: `${r.file}:${p.line}`, ...p })));
  const locWidth = Math.max(0, ...rows.map((r) => r.loc.length));
  const codeWidth = Math.max(20, ...rows.map((r) => r.code.length));
  const out = rows.map(
    (r) => `${r.loc.padEnd(locWidth)}  ${r.severity.padEnd(5)}  ${r.code.padEnd(codeWidth)}  ${r.message}`
  );
  const errors = rows.filter((r) => r.severity === "erro").length;
  const warnings = rows.length - errors;
  out.push(`${errors} ${errors === 1 ? "erro" : "erros"}, ${warnings} ${warnings === 1 ? "aviso" : "avisos"}`);
  return out.join("\n");
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
function sameTitle(a, b) {
  return a.trim().toLowerCase() === b.toLowerCase();
}

// src/stats/report.ts
import { existsSync as existsSync16 } from "node:fs";
import { join as join19 } from "node:path";

// src/stats/transcripts.ts
import { closeSync as closeSync2, existsSync as existsSync15, openSync as openSync2, readFileSync as readFileSync15, readSync, readdirSync as readdirSync5, statSync as statSync6 } from "node:fs";
import { homedir } from "node:os";
import { basename as basename4, join as join18, resolve as resolve9 } from "node:path";
var EDIT_TOOLS = /* @__PURE__ */ new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
var COMPACT_DROP = 0.5;
function defaultProjectsDir(env = process.env) {
  return join18(env.CLAUDE_CONFIG_DIR || join18(homedir(), ".claude"), "projects");
}
function projectSlug(projectPath) {
  return projectPath.replace(/[^A-Za-z0-9]/g, "-");
}
function findTranscriptDirs(projectPath, projectsDir = defaultProjectsDir()) {
  if (!existsSync15(projectsDir)) return [];
  const dirs = readdirSync5(projectsDir).filter((name) => statSync6(join18(projectsDir, name)).isDirectory()).sort();
  const slug = projectSlug(resolve9(projectPath)).toLowerCase();
  const bySlug = dirs.filter((name) => name.toLowerCase() === slug);
  if (bySlug.length) return bySlug.map((name) => join18(projectsDir, name));
  const target = samePath(resolve9(projectPath));
  return dirs.map((name) => join18(projectsDir, name)).filter((dir) => sessionFiles(dir).some((file) => {
    const cwd = firstCwd(file);
    return cwd !== null && samePath(cwd) === target;
  }));
}
function sessionFiles(dir) {
  return readdirSync5(dir).filter((f) => f.endsWith(".jsonl")).sort().map((f) => join18(dir, f));
}
function readSession(file) {
  const records = parseJsonl(readFileSync15(file, "utf8")).filter((r) => !r.isSidechain);
  let start = null;
  let end = null;
  for (const r of records) {
    if (typeof r.timestamp !== "string" || Number.isNaN(Date.parse(r.timestamp))) continue;
    if (start === null || r.timestamp < start) start = r.timestamp;
    if (end === null || r.timestamp > end) end = r.timestamp;
  }
  const contexts = [];
  const seenMessages = /* @__PURE__ */ new Set();
  const seenTools = /* @__PURE__ */ new Set();
  let toolCalls = 0;
  let toolCallsBeforeEdit = null;
  for (const r of records) {
    if (r.type !== "assistant" || r.isApiErrorMessage || !r.message || r.message.model === "<synthetic>") continue;
    const messageId = r.message.id ?? r.requestId ?? r.uuid ?? `#${contexts.length}`;
    if (!seenMessages.has(messageId)) {
      const context = contextTokens(r.message.usage);
      if (context > 0) {
        seenMessages.add(messageId);
        contexts.push(context);
      }
    }
    for (const block of Array.isArray(r.message.content) ? r.message.content : []) {
      const tool = block;
      if (tool?.type !== "tool_use") continue;
      const key = tool.id ?? `${messageId}#${toolCalls}`;
      if (seenTools.has(key)) continue;
      seenTools.add(key);
      if (toolCallsBeforeEdit === null && EDIT_TOOLS.has(tool.name ?? "")) toolCallsBeforeEdit = toolCalls;
      toolCalls++;
    }
  }
  const openingTokens = contexts[0];
  if (openingTokens === void 0 || start === null || end === null) return null;
  return {
    id: basename4(file, ".jsonl"),
    file,
    start,
    end,
    durationMs: Date.parse(end) - Date.parse(start),
    openingTokens,
    toolCallsBeforeEdit,
    toolCalls,
    estimatedCompactions: estimateCompactions(contexts)
  };
}
function estimateCompactions(contexts) {
  let count = 0;
  for (let i = 1; i < contexts.length; i++) {
    if (contexts[i] < contexts[i - 1] * (1 - COMPACT_DROP)) count++;
  }
  return count;
}
function readCompactionMetrics(projectRoot) {
  const file = join18(projectRoot, METRICS_FILE);
  const counts = /* @__PURE__ */ new Map();
  if (!existsSync15(file)) return counts;
  for (const r of parseJsonl(readFileSync15(file, "utf8"))) {
    if (typeof r.session_id !== "string" || !r.session_id) continue;
    counts.set(r.session_id, (counts.get(r.session_id) ?? 0) + (r.evento === "compact" ? 1 : 0));
  }
  return counts;
}
function projectSessions(projectRoot, projectsDir = defaultProjectsDir()) {
  const dirs = findTranscriptDirs(projectRoot, projectsDir);
  const metrics = readCompactionMetrics(projectRoot);
  const byId = /* @__PURE__ */ new Map();
  let empty = 0;
  for (const file of dirs.flatMap(sessionFiles)) {
    const session = readSession(file);
    if (!session) {
      empty++;
      continue;
    }
    if (byId.has(session.id)) continue;
    const { estimatedCompactions, ...rest } = session;
    const measured = metrics.get(session.id);
    byId.set(session.id, {
      ...rest,
      compactions: measured ?? estimatedCompactions,
      compactionsEstimated: measured === void 0
    });
  }
  const sessions = [...byId.values()].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : a.id < b.id ? -1 : 1);
  return { dirs, sessions, empty };
}
function contextTokens(usage) {
  if (!usage) return 0;
  const n = (v) => typeof v === "number" && Number.isFinite(v) ? v : 0;
  return n(usage.input_tokens) + n(usage.cache_read_input_tokens) + n(usage.cache_creation_input_tokens);
}
function parseJsonl(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      if (data && typeof data === "object" && !Array.isArray(data)) out.push(data);
    } catch {
    }
  }
  return out;
}
function firstCwd(file) {
  const fd = openSync2(file, "r");
  try {
    const buffer = Buffer.alloc(64 * 1024);
    const bytes = readSync(fd, buffer, 0, buffer.length, 0);
    const record = parseJsonl(buffer.toString("utf8", 0, bytes)).find((r) => typeof r.cwd === "string" && r.cwd);
    return record?.cwd ?? null;
  } finally {
    closeSync2(fd);
  }
}
function samePath(path) {
  const normal = path.replace(/\\/g, "/").replace(/\/+$/, "");
  return process.platform === "win32" ? normal.toLowerCase() : normal;
}

// src/stats/report.ts
var DATE2 = /^(\d{4})-(\d{2})-(\d{2})$/;
function isIsoDate(value) {
  const m = DATE2.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
function localDate2(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function buildReport(projectRoot, options = {}) {
  const { dirs, sessions, empty } = projectSessions(projectRoot, options.projectsDir ?? defaultProjectsDir());
  const rows = sessions.map(({ file: _file, ...s }) => ({ ...s, date: localDate2(s.start) }));
  const repeatedErrors = readRepeatedErrors(projectRoot);
  const splitAt = options.splitAt ?? null;
  const periods = splitAt ? [
    ["antes", rows.filter((s) => s.date < splitAt)],
    ["depois", rows.filter((s) => s.date >= splitAt)]
  ] : [["todas", rows]];
  const groups = periods.map(([label, group], i) => summarize(label, group, i === periods.length - 1 ? repeatedErrors?.total ?? null : null));
  return { project: projectRoot, splitAt, transcriptDirs: dirs, emptySessions: empty, sessions: rows, groups, repeatedErrors };
}
function summarize(label, sessions, repeatedErrors) {
  const edited = sessions.map((s) => s.toolCallsBeforeEdit).filter((n) => n !== null);
  const compactions = sessions.reduce((sum, s) => sum + s.compactions, 0);
  return {
    label,
    sessions: sessions.length,
    openingTokens: median(sessions.map((s) => s.openingTokens)),
    toolCallsBeforeEdit: median(edited),
    sessionsWithEdit: edited.length,
    compactionsPerSession: sessions.length ? compactions / sessions.length : null,
    compactionsEstimated: sessions.some((s) => s.compactionsEstimated),
    repeatedErrors
  };
}
function readRepeatedErrors(projectRoot) {
  if (!existsSync16(join19(projectRoot, TRACK_DIRS.bug))) return null;
  const entries = loadTrack(projectRoot, "bug").entries.map((e) => ({ slug: e.slug, occurrences: e.frontmatter.occurrences })).filter((e) => Number.isInteger(e.occurrences) && e.occurrences > 1);
  return { total: entries.reduce((sum, e) => sum + e.occurrences - 1, 0), entries };
}
function formatNumber(value, decimals = 0) {
  const [int, frac] = Math.abs(value).toFixed(decimals).split(".");
  const grouped = (int ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value < 0 ? "-" : ""}${grouped}${frac ? `,${frac}` : ""}`;
}
function formatDuration(ms) {
  const minutes = Math.round(ms / 6e4);
  if (minutes < 1) return "<1min";
  if (minutes < 60) return `${minutes}min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}
function formatReport2(report) {
  const out = [];
  const plural = (n, one, many) => `${formatNumber(n)} ${n === 1 ? one : many}`;
  const ignored = report.emptySessions ? ` (${plural(report.emptySessions, "sem resposta do modelo, ignorada", "sem resposta do modelo, ignoradas")})` : "";
  out.push(`${plural(report.sessions.length, "sess\xE3o", "sess\xF5es")} de ${report.project}${ignored}`);
  out.push(...report.transcriptDirs.map((dir) => `  hist\xF3ricos: ${dir}`));
  if (!report.sessions.length) return out.join("\n");
  const header = ["data", "sess\xE3o", "dura\xE7\xE3o", "abertura", "at\xE9 editar", "tool calls", "compacta\xE7\xF5es"];
  const right = [false, false, true, true, true, true, true];
  const rows = report.sessions.map((s) => [
    s.date,
    s.id.slice(0, 8),
    formatDuration(s.durationMs),
    formatNumber(s.openingTokens),
    s.toolCallsBeforeEdit === null ? "-" : formatNumber(s.toolCallsBeforeEdit),
    formatNumber(s.toolCalls),
    `${s.compactionsEstimated ? "~" : ""}${s.compactions}`
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => cells.map((c, i) => right[i] ? c.padStart(widths[i]) : c.padEnd(widths[i])).join("  ").trimEnd();
  out.push("", line(header));
  const splitIndex = report.splitAt ? report.sessions.findIndex((s) => s.date >= report.splitAt) : -1;
  rows.forEach((row, i) => {
    if (i === splitIndex) out.push(`-- a partir de ${report.splitAt} --`);
    out.push(line(row));
  });
  out.push("", ...formatSummary(report.groups));
  out.push("", "tokens e tool calls: mediana por sess\xE3o \xB7 compacta\xE7\xF5es: m\xE9dia por sess\xE3o \xB7 ~ estimado pela queda de contexto");
  if (report.repeatedErrors?.entries.length) {
    out.push(`erros que voltaram: ${report.repeatedErrors.entries.map((e) => `${e.slug} (${e.occurrences}x)`).join(", ")}`);
  }
  return out.join("\n");
}
function formatSummary(groups) {
  const dash = (v, decimals = 0) => v === null ? "-" : formatNumber(v, decimals);
  const table = [
    ["", ...groups.map((g) => `${g.label} (${g.sessions} ${g.sessions === 1 ? "sess\xE3o" : "sess\xF5es"})`)],
    ["tokens na abertura", ...groups.map((g) => dash(g.openingTokens === null ? null : Math.round(g.openingTokens)))],
    ["tool calls at\xE9 editar", ...groups.map((g) => dash(g.toolCallsBeforeEdit, Number.isInteger(g.toolCallsBeforeEdit ?? 0) ? 0 : 1))],
    ["compacta\xE7\xF5es/sess\xE3o", ...groups.map((g) => `${dash(g.compactionsPerSession, 1)}${g.compactionsEstimated && g.sessions ? " (estimado)" : ""}`)],
    ["erros repetidos", ...groups.map((g) => dash(g.repeatedErrors))]
  ];
  const widths = table[0].map((_, i) => Math.max(...table.map((r) => r[i].length)));
  return table.map((row) => row.map((c, i) => c.padEnd(widths[i] + (i < row.length - 1 ? 3 : 0))).join("").trimEnd());
}

// src/cli.ts
var USAGE = `uso: builderdev <comando> [op\xE7\xF5es]

comandos:
  lint [caminhos...]          valida planos, entradas de memory/ e errors/ e o .dev/CLAUDE.md
                              (padr\xE3o: o projeto inteiro); sai com 1 se houver erro
  init [pasta]                cria a estrutura .dev/ no projeto (padr\xE3o: pasta atual)
  entry new --track conhecimento|bug --slug <slug>
                              cria a entrada em .dev/memory/ ou .dev/errors/, pronta para preencher
  reindex                     gera .dev/memory/index.md e .dev/errors/index.md a partir do frontmatter
  recall <termos...> [--full] busca entradas pelo frontmatter; --full imprime as 3 primeiras inteiras
  status [plano] [--json]     status de cada fase, derivado dos commits com o trailer Plan-Step
         [--all]              considera commits de todas as branches, n\xE3o s\xF3 de HEAD
  start <plano>/<fase>        grava a fase ativa em .dev/.local/state.json
        [--force]             ativa mesmo com depend\xEAncias pendentes
  stop                        limpa a fase ativa
  brief [plano/fase]          imprime s\xF3 a fase ativa (ou a indicada), com Contexto e Fora do escopo
  stats [--project <caminho>] [--split-at <AAAA-MM-DD>] [--json]
                              m\xE9tricas por sess\xE3o dos hist\xF3ricos do Claude Code e medianas antes e depois da data
  migrate split <arquivos...> divide MEMORY.md, ERRORS.md etc. pelos t\xEDtulos em candidatos em .dev/.local/migration/
  dashboard [--root <pasta>] [--port <n>] [--no-open]
                              painel no navegador com um card por projeto das subpastas da raiz
                              (padr\xE3o: pasta atual, porta ${DEFAULT_PORT}; 0 escolhe uma livre)
  hooks install|uninstall     instala ou remove o git hook prepare-commit-msg
  commit-msg <arquivo> [origem]
                              usado pelo git hook: preenche a mensagem e o trailer da fase ativa
  hook session-start|stop|post-compact
                              usado pelos hooks do Claude Code, com o JSON do evento no stdin

op\xE7\xF5es gerais:
  -h, --help                  mostra esta ajuda
  -v, --version               mostra a vers\xE3o`;
var commands = {
  lint(args) {
    const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
    const cwd = process.cwd();
    const root = findProjectRoot(cwd);
    const mdFiles = (dir) => readdirSync6(dir).filter((f) => f.endsWith(".md")).sort().map((f) => join20(dir, f));
    const plans = [];
    const entries = [];
    const claudeMds = [];
    let missing = 0;
    if (!positionals.length && existsSync17(join20(root, PLANS_DIR))) plans.push(...mdFiles(join20(root, PLANS_DIR)));
    for (const target of positionals) {
      const abs = resolve10(cwd, target);
      if (!existsSync17(abs)) {
        console.error(`builderdev lint: caminho n\xE3o encontrado: ${target}`);
        missing++;
        continue;
      }
      for (const file of statSync7(abs).isDirectory() ? mdFiles(abs) : [abs]) {
        if (isEntryPath(file)) entries.push(file);
        else if (trackOfPath(file)) continue;
        else if (basename5(file) === "CLAUDE.md") claudeMds.push(file);
        else plans.push(file);
      }
    }
    const reports = [
      ...plans.map((file) => ({ file, problems: lintPlanFile(file) })),
      ...positionals.length ? entries.length ? lintMemory(root, entries) : [] : lintMemory(root),
      ...claudeMds.map((file) => ({ file, problems: lintClaudeMd(file) }))
    ].map((r) => ({ ...r, file: relative6(cwd, r.file).split(sep5).join("/") }));
    if (!reports.length) {
      if (!missing) console.log("nada a validar: nenhum plano nem entrada de mem\xF3ria encontrado");
      return missing ? 1 : 0;
    }
    console.log(formatReport(reports));
    const failed = reports.some((r) => r.problems.some((p) => p.severity === "erro"));
    return failed || missing ? 1 : 0;
  },
  init(args) {
    const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
    if (positionals.length > 1) throw new UsageError("init aceita no m\xE1ximo uma pasta");
    const root = resolve10(positionals[0] ?? ".");
    const actions = init(root);
    console.log(actions.length ? actions.join("\n") : "nada a fazer: a estrutura .dev/ j\xE1 existe");
    return 0;
  },
  status(args) {
    const { positionals, values } = parseArgs({
      args,
      allowPositionals: true,
      options: { json: { type: "boolean" }, all: { type: "boolean" } }
    });
    if (positionals.length > 1) throw new UsageError("status aceita no m\xE1ximo um plano");
    const root = findProjectRoot();
    const plans = listPlans(root);
    const selected = positionals[0] ? [findPlan(root, positionals[0], plans)] : plans;
    const active = readState(root);
    const steps = readPlanSteps(root, { all: values.all });
    const statuses = selected.map((entry) => planStatus(entry, steps, active));
    if (values.json) {
      console.log(JSON.stringify({ active, plans: statuses }, null, 2));
    } else if (!statuses.length) {
      console.log(`nenhum plano em ${PLANS_DIR}/`);
    } else {
      console.log(statuses.map(formatPlanStatus).join("\n\n"));
      if (active) {
        const ref = `${active.plan}/${active.phase}`;
        const activePlan = plans.find((p) => p.id === active.plan);
        const phase = activePlan && planStatus(activePlan, steps, active).phases.find((p) => p.id === active.phase);
        if (!phase) console.log(`
A fase ativa ${ref} n\xE3o existe mais nos planos: builderdev stop para limpar.`);
        else if (phase.status === "concluida") console.log(`
A fase ativa ${ref} j\xE1 est\xE1 conclu\xEDda: builderdev start <plano>/<pr\xF3xima fase>.`);
      }
    }
    return statuses.some((s) => s.error) ? 1 : 0;
  },
  start(args) {
    const { positionals, values } = parseArgs({ args, allowPositionals: true, options: { force: { type: "boolean" } } });
    if (positionals.length !== 1) throw new UsageError("uso: builderdev start <plano>/<fase> [--force]");
    const result = startPhase(findProjectRoot(), positionals[0], { force: values.force });
    for (const warning of result.warnings) console.error(`aviso: ${warning}`);
    const ref = `${result.state.plan}/${result.state.phase}`;
    const previous = result.previous ? `${result.previous.plan}/${result.previous.phase}` : null;
    const title = result.title ? ` \xB7 ${result.title}` : "";
    console.log(`fase ativa: ${ref}${title}${previous && previous !== ref ? ` (antes: ${previous})` : ""}`);
    return 0;
  },
  stop(args) {
    parseArgs({ args, allowPositionals: false, options: {} });
    const previous = clearState(findProjectRoot());
    console.log(previous ? `fase ${previous.plan}/${previous.phase} desativada` : "nenhuma fase ativa");
    return 0;
  },
  brief(args) {
    const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
    if (positionals.length > 1) throw new UsageError("uso: builderdev brief [plano/fase]");
    const root = findProjectRoot();
    const ref = positionals[0] ? parsePhaseRef(positionals[0]) : readState(root);
    if (!ref) throw new ProjectError("nenhuma fase ativa: use builderdev start <plano>/<fase> ou builderdev brief <plano>/<fase>");
    process.stdout.write(brief(findPlan(root, ref.plan), ref.phase));
    return 0;
  },
  reindex(args) {
    parseArgs({ args, allowPositionals: false, options: {} });
    const results = reindex(findProjectRoot());
    if (!results.length) throw new ProjectError("nem .dev/memory nem .dev/errors existem: rode builderdev init");
    let failed = false;
    for (const r of results) {
      const count = `${r.entries} ${r.entries === 1 ? "entrada" : "entradas"}`;
      console.log(`${(r.changed ? "atualizado" : "sem mudan\xE7a").padEnd(12)}${r.path} (${count})`);
      for (const s of r.skipped) console.error(`aviso: ${s.message} em ${relative6(process.cwd(), s.path).split(sep5).join("/")}:${s.line}; a entrada ficou fora do \xEDndice`);
      if (r.overBudget) {
        console.error(`erro: ${r.path} tem ${r.lines} linhas (m\xE1ximo ${INDEX_MAX_LINES}): funda ou remova entradas`);
        failed = true;
      }
    }
    return failed ? 1 : 0;
  },
  entry(args) {
    const [sub, ...rest] = args;
    if (sub !== "new") throw new UsageError("uso: builderdev entry new --track conhecimento|bug --slug <slug>");
    const { values } = parseArgs({ args: rest, allowPositionals: false, options: { track: { type: "string" }, slug: { type: "string" } } });
    if (!values.track || !values.slug) throw new UsageError("uso: builderdev entry new --track conhecimento|bug --slug <slug>");
    console.log(`criado      ${newEntry(findProjectRoot(), values.track, values.slug)}`);
    return 0;
  },
  recall(args) {
    const { positionals, values } = parseArgs({ args, allowPositionals: true, options: { full: { type: "boolean" } } });
    const terms = parseTerms(positionals);
    if (!terms.length) throw new UsageError("uso: builderdev recall <termos...> [--full]");
    const root = findProjectRoot();
    const hits = recall(root, terms);
    console.log(hits.length ? formatRecall(root, hits, { full: values.full }) : `nenhuma entrada coincide com: ${terms.join(" ")}`);
    return 0;
  },
  stats(args) {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      options: { project: { type: "string" }, "split-at": { type: "string" }, json: { type: "boolean" } }
    });
    const splitAt = values["split-at"];
    if (splitAt !== void 0 && !isIsoDate(splitAt)) throw new UsageError(`--split-at deve ser uma data AAAA-MM-DD, n\xE3o "${splitAt}"`);
    const root = values.project ? resolve10(values.project) : findProjectRoot();
    if (!existsSync17(root) || !statSync7(root).isDirectory()) throw new ProjectError(`pasta do projeto n\xE3o encontrada: ${values.project}`);
    const report = buildReport(root, { splitAt });
    if (!report.transcriptDirs.length) {
      throw new ProjectError(`nenhum hist\xF3rico do Claude Code para ${root} em ${defaultProjectsDir()}`);
    }
    console.log(values.json ? JSON.stringify(report, null, 2) : formatReport2(report));
    return 0;
  },
  migrate(args) {
    const [sub, ...rest] = args;
    if (sub !== "split") throw new UsageError("uso: builderdev migrate split <arquivos...>");
    const { positionals } = parseArgs({ args: rest, allowPositionals: true, options: {} });
    if (!positionals.length) throw new UsageError("uso: builderdev migrate split <arquivos...>");
    const cwd = process.cwd();
    const root = findProjectRoot(cwd);
    if (!existsSync17(join20(root, ".dev"))) throw new ProjectError("nenhuma pasta .dev/ encontrada: rode builderdev init antes");
    const files = positionals.map((p) => resolve10(cwd, p));
    const missing = positionals.filter((_, i) => !existsSync17(files[i]) || !statSync7(files[i]).isFile());
    if (missing.length) throw new ProjectError(`arquivo n\xE3o encontrado: ${missing.join(", ")}`);
    console.log(formatSplit(splitFiles(root, files)));
    return 0;
  },
  // Resolve assim que o servidor sobe; o processo continua vivo por ele até o Ctrl+C.
  async dashboard(args) {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      options: { root: { type: "string" }, port: { type: "string" }, "no-open": { type: "boolean" } }
    });
    const root = resolve10(values.root ?? ".");
    if (!existsSync17(root) || !statSync7(root).isDirectory()) throw new ProjectError(`pasta n\xE3o encontrada: ${values.root}`);
    const port = values.port === void 0 ? DEFAULT_PORT : Number(values.port);
    if (!/^\d+$/.test(values.port ?? "0") || port > 65535) throw new UsageError(`--port deve ser um n\xFAmero de 0 a 65535, n\xE3o "${values.port}"`);
    const uiDir = fileURLToPath2(new URL("./ui/", import.meta.url));
    if (!existsSync17(join20(uiDir, "index.html"))) throw new ProjectError(`UI n\xE3o encontrada em ${uiDir}: rode npm run build`);
    const dashboard = await startServer({ root, port, uiDir }).catch((err) => {
      if (err.code === "EADDRINUSE") throw new ProjectError(`a porta ${port} j\xE1 est\xE1 em uso: escolha outra com --port <n> (0 pega uma livre)`);
      throw err;
    });
    const { projects } = await dashboard.scan();
    const count = `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`;
    console.log(`painel em ${dashboard.url} (${count}; Ctrl+C encerra)`);
    if (!values["no-open"]) openBrowser(dashboard.url);
    const shutdown = () => {
      void dashboard.close().then(() => process.exit(0));
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    return 0;
  },
  hooks(args) {
    const [sub, ...rest] = args;
    if (rest.length || sub !== "install" && sub !== "uninstall") throw new UsageError("uso: builderdev hooks install | uninstall");
    const cwd = process.cwd();
    if (sub === "install") {
      const r = installHook(cwd);
      const note = r.backup ? ` (hook anterior preservado; c\xF3pia em ${r.backup})` : "";
      console.log(`${r.action.padEnd(12)}${r.path}${note}`);
      if (!onPath("builderdev")) {
        console.error("aviso: builderdev n\xE3o est\xE1 no PATH, e o hook fica inerte at\xE9 isso mudar (rode npm link no reposit\xF3rio do builderdev)");
      }
    } else {
      const r = uninstallHook(cwd);
      const messages = {
        removido: `removido    ${r.path}`,
        restaurado: `restaurado  ${r.path} (hook anterior de volta; c\xF3pia .bak apagada)`,
        "bloco removido": `bloco do builderdev removido de ${r.path}`,
        ausente: `nada a fazer: ${r.path} n\xE3o tem o bloco do builderdev`
      };
      console.log(messages[r.action]);
    }
    return 0;
  },
  // Chamado pelos hooks do Claude Code (hooks/hooks.json), com o JSON do evento no stdin.
  // Nunca sai com 2: no Stop, o código 2 bloquearia o fim do turno. Erro interno sai com 1, que o Claude Code só exibe.
  hook(args) {
    const [event, ...rest] = args;
    const run = event ? HOOKS[event] : void 0;
    if (!run || rest.length) {
      console.error(`builderdev hook: uso: builderdev hook ${Object.keys(HOOKS).join(" | ")}`);
      return 1;
    }
    try {
      const input = parseHookInput(readStdin());
      const root = hookProjectRoot(input);
      if (!root) return 0;
      const output = run(root, input);
      if (output) process.stdout.write(`${JSON.stringify(output)}
`);
    } catch (err) {
      console.error(`builderdev hook ${event}: ${err.message}`);
      return 1;
    }
    return 0;
  },
  // Chamado pelo git hook: avisa no stderr, mas nunca falha e nunca bloqueia o commit.
  "commit-msg"(args) {
    try {
      const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
      const [file, source] = positionals;
      if (!file) throw new UsageError("uso: builderdev commit-msg <arquivo> [origem]");
      prepareCommitMsg(file, source || void 0);
    } catch (err) {
      const hint = err instanceof ProjectError ? " (fase ativa desatualizada? builderdev stop limpa)" : "";
      console.error(`builderdev commit-msg: ${err.message}${hint}; o commit segue sem o trailer`);
    }
    return 0;
  }
};
var HOOKS = {
  "session-start": (root, input) => sessionStart(root, input).output,
  stop: (root, input) => stopHook(root, input).output,
  "post-compact": (root, input) => {
    postCompact(root, input);
    return void 0;
  }
};
function readStdin() {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync16(0, "utf8");
  } catch {
    return "";
  }
}
function onPath(name) {
  return (process.env.PATH ?? "").split(delimiter).filter(Boolean).some((dir) => existsSync17(join20(dir, name)) || existsSync17(join20(dir, `${name}.exe`)));
}
function openBrowser(url) {
  const [cmd, args, verbatim] = process.platform === "win32" ? ["cmd", ["/d", "/c", "start", '""', url], true] : [process.platform === "darwin" ? "open" : "xdg-open", [url], false];
  const child = spawn(cmd, args, { stdio: "ignore", detached: true, windowsHide: true, windowsVerbatimArguments: verbatim });
  child.on("error", () => console.error("aviso: n\xE3o deu para abrir o navegador; abra a URL acima"));
  child.unref();
}
var UsageError = class extends Error {
};
async function main(argv) {
  const [name, ...rest] = argv;
  if (!name || name === "-h" || name === "--help" || name === "help") {
    console.log(USAGE);
    return name ? 0 : 2;
  }
  if (name === "-v" || name === "--version") {
    console.log(package_default.version);
    return 0;
  }
  const command = commands[name];
  if (!command) {
    console.error(`builderdev: comando desconhecido "${name}"

${USAGE}`);
    return 2;
  }
  try {
    return await command(rest);
  } catch (err) {
    const code = err.code ?? "";
    if (err instanceof UsageError || code.startsWith("ERR_PARSE_ARGS")) {
      console.error(`builderdev ${name}: ${err.message}`);
      return 2;
    }
    if (err instanceof ProjectError || err instanceof GitError) {
      console.error(`builderdev ${name}: ${err.message}`);
      return 1;
    }
    throw err;
  }
}
process.exitCode = await main(process.argv.slice(2));
