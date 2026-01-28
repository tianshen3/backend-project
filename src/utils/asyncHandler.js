const asyncHandler = (requestHandler) => { 
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
};

export {asyncHandler}



//this part is application of asyncHandler using try and catch method

// // a fucnction is being passed in the arrow function and to make it a async function it is being further passed down to another arrow function


// const asyncHandler = (fn) =>  async (req, res, next) => {
//     try{
//         await fn(req, res, next)
//     } catch(error){
//         res.status(error.code || 500).json({
//             success : false,
//             message : error.message
//         })
//     }
// }