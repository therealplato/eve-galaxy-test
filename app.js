var async = require('async');
var db = require('mysql').createConnection({
    hostname: 'localhost',
    user: 'root',
    password: 'password',
    database: 'test',
    supportBigNumbers:true,
});

function handler(req, res){ // respond to any http request with a json file of solarsystem data
  getScaledGalaxy(function(err, scaled, LO, jumps){
    if(err){  res.end(500, err)  };
    var data = {
      systems: scaled,
      LO: LO,
      jumps: jumps,
    };
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", //allow request from localhost
    });
    res.end(JSON.stringify(data));
  });
};

require('http').createServer(handler).listen(3210);



function getScaledGalaxy(callback){
  async.waterfall(
  [ function(next){
      getGalaxy(function(err, systems, jumps){
        if(!err){ 
          //console.log(JSON.stringify(systems,null,2));
          next(null, systems, jumps)
        } else {next(err); }
      });
    },
  ],
  function(err, systems, jumps){
    scaleSystems(systems, function(err,scaled,LO){
      process.nextTick(function(){
        callback(err,scaled,LO,jumps);
      });
    });
  });
};

function getGalaxy(callback){
  async.waterfall(
[ function(next){
    db.query("SELECT ss.security, ss.constellationID, ss.solarSystemName, ss.solarSystemID,ss.x,ss.y,ss.z FROM mapSolarSystems AS ss"
            +" WHERE (ss.solarSystemID < 31000000)"
    , function(err,rows,cols){
      if(!err){
        var systems = [];
        rows.forEach(function(row){ 
          systems.push(row) 
        });
        next(null, systems);
      } else {
        next(err)
      };
    });
  },
],function(err, systems){
    if(!err){ callback(null, systems, []) } // jumps is empty array for now but would represent stargate connections
    else {callback(err) }
  });
};


function scaleSystems(systems,callback){
  // calculate relative displacements, to fit to hex grid
  function magn(ss){  return Math.sqrt(ss.x*ss.x+ss.y*ss.y+ss.z*ss.z) };
  function copy(a){
    var b = {};
    for(var p in a){
      if(a.hasOwnProperty(p)){ b[p] = a[p] };
    };
    return b;
  };
  async.waterfall(
[ function(next){
    // calculate 'center' of constellation    
    var raft = {ss:[], LO:{}}; 
    var n_s = systems.length;
    var sum = [0,0,0];
    for(i=0;i<n_s;i++){
      sum[0] += systems[i].x;
      sum[1] += systems[i].y;
      sum[2] += systems[i].z;
      raft.ss.push(copy(systems[i]));
    };
    /* 'local origin' (arithmetic mean)*/
    raft.LO.x = sum[0]/n_s;  
    raft.LO.y = sum[1]/n_s;
    raft.LO.z = sum[2]/n_s;
    next(null,raft);
  },
  function(raft, next){
    // Pick a system near the center of the constellation to use as origin
    for(i=0; i<raft.ss.length; i++){
      // subtract local origin to change raft.ss into local coords
      raft.ss[i].x -= raft.LO.x;
      raft.ss[i].y -= raft.LO.y;
      raft.ss[i].z -= raft.LO.z;
    };
    next(null, raft);
  }, 
  function(raft,next){
    // Sort systems in increasing magn from newO
    // place the system with least magnitude at 0,0
    raft.ss.sort(function(a,b){
      return magn(a) > magn(b);
    });
    
    // Find x,y bounds, then scale to -1..1
    var x0=x1
       =y0=y1
       =z0=z1 = 0;  

    raft.ss.forEach(function (n){  
      if(n.x < x0){x0=n.x};
      if(n.x > x1){x1=n.x};
      if(n.y < y0){y0=n.y};
      if(n.y > y1){y1=n.y};
      if(n.z < z0){z0=n.z};
      if(n.z > z1){z1=n.z};
    });

    console.log(x0, x1);
    raft.LO.x = x0+0.5*(x1-x0);
    raft.LO.y = y0+0.5*(y1-y0);
    raft.LO.z = z0+0.5*(z1-z0);
    raft.xmax = Math.abs(x0) > x1 ? Math.abs(x0) : x1;
    raft.ymax = Math.abs(y0) > y1 ? Math.abs(y0) : y1;
    raft.zmax = Math.abs(z0) > z1 ? Math.abs(z0) : z1;
    if(
    (raft.zmax > raft.ymax) && (raft.zmax > raft.xmax)
    ){ raft.max = raft.zmax; };
    if(
    (raft.ymax > raft.xmax) && (raft.ymax > raft.zmax)
    ){ raft.max = raft.ymax; };
    if(
    (raft.xmax > raft.ymax) && (raft.xmax > raft.zmax)
    ){ raft.max = raft.xmax; };
    next(null,raft);
  },
  function(raft,next){
    // Scale x,y to -1..1
    // Precision problems here?
    raft.ss.forEach(function(n){
      n.x = n.x/raft.max || 0;
      n.y = n.y/raft.max || 0;
      n.z = n.z/raft.max || 0;
    });
    raft.LO.x *= (1/raft.max);
    raft.LO.y *= (1/raft.max);
    raft.LO.z *= (1/raft.max);
    next(null, raft);
  },
],function(err,raft){
    console.log(raft);
    process.nextTick(function(){
      callback(null, raft.ss, raft.LO);
    });
  });
}; // end of scaleSystems
