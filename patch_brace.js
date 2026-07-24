const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const target = `                                }
                            }
                        } catch (e) {`;
                        
const replace = `                                }
                                }
                            }
                        } catch (e) {`;

server = server.replace(target, replace);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched missing brace");
