// A Sevent is created when something happens
// id, aggregate_id, type, data (json), metadata (json), created_at
function Ev(metadata, data, hash) {
  this.metadata = metadata;
  this.data = data;
  this.hash = hash;
  this.createdAt = Date.now();
}

// An Aggregate has a Sevents table associated to it
function Aggregate(name) {
  this.name = name;
  this.evs = [{hash: ''}];
  this.branches = [];
  this.table = [];
}

Aggregate.prototype.latestEv = function () {
  return this.evs[this.evs.length - 1];
};

Aggregate.prototype.clone = function () {
  const agg = new Aggregate(this.name);
  agg.evs = this.evs;
  agg.branches = this.branches;
  agg.table = this.table;
  return agg;
};

Aggregate.prototype.add = async function (ev) {
  const latestHash = this.latestEv().hash;
  if (ev.metadata.prevHash === latestHash || ev.metadata.catchUp === latestHash) {
    this.evs = this.evs.concat(ev);

    // On Insert
    if (ev.metadata.type === 'insert') {
      if (this.table.some(x => x.id === ev.data.id)) {
        throw new Error('Duplicate index');
      } else {
        this.table = this.table.concat(ev.data);
        return this.reverseAdd(ev.hash);
      }

    // On CatchUp
    } else if (ev.metadata.type === 'catchUp') {
      this.table = Object.values(ev.data);
      return this.reverseAdd(ev.hash);

    // On Modify
    } else if (ev.metadata.type === 'modify') {
      if (this.table.some(x => x.id === ev.data.id)) {
        const elem = this.table.find(x => x.id === ev.data.id);
        Object.keys(ev.data).filter(x => x !== 'id').forEach(x => {
          elem[x] = ev.data[x];
        });
        return this.reverseAdd(ev.hash);
      }
      throw new Error('Could not find object to modify');

    // On Delete
    } else if (ev.metadata.type === 'delete') {
      const i = this.table.findIndex(x => x.id === ev.data);
      if (i >= 0) {
        this.table.splice(i, 1);
        return this.reverseAdd(ev.hash);
      }
      throw new Error('Could not find object to delete');
    }
    // } else if (ev.metadata.type === 'merge') {
    // }  else if SPECIAL EVENT
  } else {
    this.branches = this.branches.concat(ev);
    return this.clone();
  }
};

Aggregate.prototype.reverseAdd = async function (hash) {
  const toBeAdded = ev => ev.metadata.prevHash === hash || ev.metadata.catchUp === hash;
  const toAdd = this.branches.filter(toBeAdded);
  toAdd.forEach(async ev => {
    await this.add(ev);
  });
  this.branches = this.branches.filter(ev => !toBeAdded(ev));
  return this.clone();
};

// Reactors react to certain events
function Reactor() {

}

Reactor.prototype.call = () => {

};

// Dispatchers connect Reactors to Evs
function Dispatcher() {

}

Dispatcher.prototype.add = () => {

};

// A calculator keeps track of some global state
function Calculator() {

}

const Evso = {
  Ev,
  Dispatcher,
  Aggregate,
  Calculator
};

module.exports = Evso;
