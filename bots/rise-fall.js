export default {id:'rise-fall',name:'Rise / Fall',description:'Independent direction bot using the latest tick movement.',contract:'CALL',choose(ctx){return ctx.last>ctx.previous?'rise':'fall';}};
